import { assertPrisma } from './db/prismaClient.js';
import { decrypt, encrypt } from "./services/encryption.js";

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
