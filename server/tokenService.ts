import crypto from 'crypto';
import { assertPrisma } from './db/prismaClient.js';
import { loadEnv } from './env.js';

const env = loadEnv();

function encrypt(text: string): string {
  if (!env.oauthEncryptionKey) {
    throw new Error('OAUTH_ENCRYPTION_KEY not configured');
  }
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(env.oauthEncryptionKey, 'hex'),
    iv
  );
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text: string): string {
  if (!env.oauthEncryptionKey) {
    throw new Error('OAUTH_ENCRYPTION_KEY not configured');
  }
  const [ivHex, encryptedHex] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(env.oauthEncryptionKey, 'hex'),
    iv
  );
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export async function saveTokens(
  service: string,
  accessToken: string,
  refreshToken: string | null,
  expiresAt: Date
) {
  const prisma = assertPrisma();
  return prisma.oAuthToken.upsert({
    where: { service },
    create: {
      service,
      accessToken: encrypt(accessToken),
      refreshToken: refreshToken ? encrypt(refreshToken) : null,
      expiresAt,
    },
    update: {
      accessToken: encrypt(accessToken),
      refreshToken: refreshToken ? encrypt(refreshToken) : null,
      expiresAt,
    },
  });
}

export async function getValidToken(service: string): Promise<string> {
  const prisma = assertPrisma();
  const token = await prisma.oAuthToken.findUnique({
    where: { service },
  });

  if (!token) {
    throw new Error(`No OAuth token found for ${service}`);
  }

  // Check if expired
  if (new Date() >= token.expiresAt) {
    // Refresh token
    const { refreshAccessToken } = await import('./google.js');
    const refreshToken = token.refreshToken ? decrypt(token.refreshToken) : null;
    if (!refreshToken) {
      throw new Error('Token expired and no refresh token available');
    }
    const { accessToken, expiresAt } = await refreshAccessToken(refreshToken);
    await saveTokens(service, accessToken, refreshToken, expiresAt);
    return accessToken;
  }

  return decrypt(token.accessToken);
}
