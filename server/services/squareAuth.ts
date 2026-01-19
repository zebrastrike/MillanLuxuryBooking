import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "crypto";
import { assertPrisma } from "../db/prismaClient.js";
import { getSquareEnvironmentName, getSquareOAuthBaseUrl } from "./square.js";

const STATE_TTL_MS = 10 * 60 * 1000;

type SquareTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_at?: string;
  merchant_id?: string;
  location_id?: string;
  token_type?: string;
  scope?: string;
};

const requireSquareEnabled = () => {
  if (process.env.SQUARE_ENABLED !== "true") {
    throw new Error("Square not enabled");
  }
};

const getEncryptionKey = () => {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("ENCRYPTION_KEY not configured");
  }
  const key = Buffer.from(raw, "hex");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be 32 bytes hex");
  }
  return key;
};

const encrypt = (value: string) => {
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-cbc", getEncryptionKey(), iv);
  let encrypted = cipher.update(value, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
};

const decrypt = (value: string) => {
  const [ivHex, encryptedHex] = value.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = createDecipheriv("aes-256-cbc", getEncryptionKey(), iv);
  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};

const getSquareAuthConfig = () => {
  const applicationId = process.env.SQUARE_APPLICATION_ID;
  const applicationSecret = process.env.SQUARE_APPLICATION_SECRET;
  const redirectUrl = process.env.SQUARE_REDIRECT_URL;
  if (!applicationId || !applicationSecret || !redirectUrl) {
    throw new Error("Square OAuth is not configured");
  }
  const scopeRaw = process.env.SQUARE_OAUTH_SCOPES || "ITEMS_READ";
  const scopes = scopeRaw.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
  return { applicationId, applicationSecret, redirectUrl, scopes };
};

const createOAuthState = () => {
  const timestamp = Date.now();
  const nonce = randomBytes(16).toString("hex");
  const payload = `${timestamp}.${nonce}`;
  const signature = createHmac("sha256", getEncryptionKey()).update(payload).digest("hex");
  return `${payload}.${signature}`;
};

export const validateOAuthState = (state: string) => {
  const parts = state.split(".");
  if (parts.length !== 3) {
    return false;
  }
  const [timestampRaw, nonce, signature] = parts;
  const timestamp = Number(timestampRaw);
  if (!Number.isFinite(timestamp)) {
    return false;
  }
  if (Date.now() - timestamp > STATE_TTL_MS) {
    return false;
  }
  const payload = `${timestampRaw}.${nonce}`;
  const expected = createHmac("sha256", getEncryptionKey()).update(payload).digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const signatureBuffer = Buffer.from(signature, "hex");
  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }
  return timingSafeEqual(expectedBuffer, signatureBuffer);
};

const requestSquareToken = async (body: Record<string, string>) => {
  const response = await fetch(`${getSquareOAuthBaseUrl()}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Square OAuth failed with status ${response.status}`);
  }

  const data = (await response.json()) as SquareTokenResponse;
  if (!data.access_token) {
    throw new Error("Square OAuth response missing access token");
  }
  return data;
};

const persistSquareTokens = async (token: SquareTokenResponse) => {
  const merchantId = token.merchant_id ?? null;
  const locationId = token.location_id ?? null;
  const expiresAt = token.expires_at ? new Date(token.expires_at) : new Date(Date.now() + 55 * 60 * 1000);

  const record = {
    service: "square",
    provider: "square",
    merchantId,
    locationId,
    payload: {
      tokenType: token.token_type ?? null,
      scope: token.scope ?? null,
      environment: getSquareEnvironmentName(),
    },
    accessToken: encrypt(token.access_token),
    refreshToken: token.refresh_token ? encrypt(token.refresh_token) : null,
    expiresAt,
  };

  try {
    const prisma = assertPrisma();
    await prisma.oAuthToken.upsert({
      where: { service: "square" },
      create: record,
      update: record,
    });
  } catch (_error) {
    throw new Error("Failed to persist Square tokens");
  }
};

export const buildSquareAuthUrl = () => {
  requireSquareEnabled();
  const { applicationId, redirectUrl, scopes } = getSquareAuthConfig();
  const state = createOAuthState();
  const url = new URL(`${getSquareOAuthBaseUrl()}/oauth2/authorize`);
  url.searchParams.set("client_id", applicationId);
  url.searchParams.set("redirect_uri", redirectUrl);
  url.searchParams.set("scope", scopes.join(" "));
  url.searchParams.set("state", state);
  return { url: url.toString() };
};

export const exchangeSquareCode = async (code: string, state: string) => {
  requireSquareEnabled();
  if (!validateOAuthState(state)) {
    throw new Error("Invalid OAuth state");
  }
  const { applicationId, applicationSecret, redirectUrl } = getSquareAuthConfig();
  const token = await requestSquareToken({
    client_id: applicationId,
    client_secret: applicationSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUrl,
  });
  await persistSquareTokens(token);
};

export const refreshSquareTokens = async () => {
  requireSquareEnabled();
  let record;
  try {
    const prisma = assertPrisma();
    record = await prisma.oAuthToken.findFirst({ where: { provider: "square" } });
  } catch (_error) {
    throw new Error("Failed to load Square token");
  }

  if (!record?.refreshToken) {
    throw new Error("Square refresh token not available");
  }

  const { applicationId, applicationSecret } = getSquareAuthConfig();
  const token = await requestSquareToken({
    client_id: applicationId,
    client_secret: applicationSecret,
    grant_type: "refresh_token",
    refresh_token: decrypt(record.refreshToken),
  });
  await persistSquareTokens(token);
};

export const getSquareConfigSummary = async () => {
  requireSquareEnabled();
  try {
    const prisma = assertPrisma();
    const record = await prisma.oAuthToken.findFirst({ where: { provider: "square" } });
    if (!record) {
      return { connected: false, environment: getSquareEnvironmentName() };
    }
    return {
      connected: true,
      environment: getSquareEnvironmentName(),
      merchantId: record.merchantId ?? null,
      locationId: record.locationId ?? null,
    };
  } catch (_error) {
    throw new Error("Failed to load Square config");
  }
};

export const disconnectSquare = async () => {
  requireSquareEnabled();
  try {
    const prisma = assertPrisma();
    await prisma.oAuthToken.deleteMany({ where: { provider: "square" } });
  } catch (_error) {
    throw new Error("Failed to disconnect Square");
  }
};
