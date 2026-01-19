import { assertPrisma } from "../db/prismaClient.js";
import { decrypt } from "./encryption.js";
import { createSquareClient } from "./square.js";

export const resolveSquareAccessToken = async () => {
  if (process.env.SQUARE_ACCESS_TOKEN) {
    return process.env.SQUARE_ACCESS_TOKEN;
  }
  const prisma = assertPrisma();
  const record = await prisma.oAuthToken.findFirst({ where: { service: "square" } });
  if (!record?.accessToken) {
    throw new Error("Square access token not available");
  }
  return decrypt(record.accessToken);
};

export const resolveSquareLocationId = async (accessToken?: string) => {
  if (process.env.SQUARE_LOCATION_ID) {
    return process.env.SQUARE_LOCATION_ID;
  }

  const prisma = assertPrisma();
  const record = await prisma.oAuthToken.findFirst({ where: { service: "square" } });
  if (record?.locationId) {
    return record.locationId;
  }

  const token = accessToken ?? (await resolveSquareAccessToken());
  const client = createSquareClient(token);
  const response = await client.locations.list();
  const location = response.locations?.[0];
  if (!location?.id) {
    throw new Error("Square location not available");
  }
  return location.id;
};
