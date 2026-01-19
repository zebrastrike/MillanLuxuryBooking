import { createDecipheriv } from "crypto";
import type { CatalogObject } from "square";
import { assertPrisma } from "../db/prismaClient.js";
import { createSquareClient, getSquareEnvironmentName } from "./square.js";

type CatalogSyncResult = {
  total: number;
  updated: number;
  skipped: number;
  errors: number;
};

type MappedCatalogItem = {
  sku: string;
  name: string;
  description?: string | null;
  price: string;
  imageUrl?: string | null;
  squareCatalogId: string;
  squareItemId: string;
  squareVariationId: string;
};

const requireSquareSyncEnabled = () => {
  if (process.env.SQUARE_SYNC_ENABLED !== "true") {
    throw new Error("Square sync not enabled");
  }
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

const decrypt = (value: string) => {
  const [ivHex, encryptedHex] = value.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = createDecipheriv("aes-256-cbc", getEncryptionKey(), iv);
  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};

const resolveSquareAccessToken = async () => {
  if (process.env.SQUARE_ACCESS_TOKEN) {
    return process.env.SQUARE_ACCESS_TOKEN;
  }
  const prisma = assertPrisma();
  const record = await prisma.oAuthToken.findFirst({ where: { provider: "square" } });
  if (!record?.accessToken) {
    throw new Error("Square access token not available");
  }
  return decrypt(record.accessToken);
};

const buildImageMap = (objects: CatalogObject[]) => {
  const map = new Map<string, string>();
  for (const obj of objects) {
    if (obj.type !== "IMAGE" || !obj.imageData?.url) {
      continue;
    }
    map.set(obj.id, obj.imageData.url);
  }
  return map;
};

const formatPrice = (amount?: bigint | number | null) => {
  if (amount === null || amount === undefined) {
    return null;
  }
  const numeric = typeof amount === "bigint" ? Number(amount) : amount;
  return (numeric / 100).toFixed(2);
};

const mapCatalogItem = (item: CatalogObject, images: Map<string, string>): MappedCatalogItem | null => {
  if (item.type !== "ITEM" || !item.itemData?.variations?.length) {
    return null;
  }
  const name = item.itemData.name?.trim();
  if (!name) {
    return null;
  }
  const variation = item.itemData.variations.find((variant) => variant.itemVariationData?.priceMoney?.amount != null);
  if (!variation?.itemVariationData) {
    return null;
  }
  const sku = variation.itemVariationData.sku?.trim();
  if (!sku) {
    return null;
  }
  const price = formatPrice(variation.itemVariationData.priceMoney?.amount);
  if (!price) {
    return null;
  }
  const imageId = item.itemData.imageIds?.[0] ?? item.itemData.imageId;
  const imageUrl = imageId ? images.get(imageId) ?? null : null;
  return {
    sku,
    name,
    description: item.itemData.description?.trim() ?? null,
    price,
    imageUrl,
    squareCatalogId: item.id,
    squareItemId: item.id,
    squareVariationId: variation.id,
  };
};

const isPrismaError = (error: unknown, code: string) => {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code: string }).code === code);
};

export const importSquareCatalog = async (): Promise<CatalogSyncResult> => {
  requireSquareSyncEnabled();
  const accessToken = await resolveSquareAccessToken();
  const client = createSquareClient(accessToken);
  const response = await client.catalogApi.listCatalog(undefined, "ITEM,IMAGE");
  const objects = response.result.objects ?? [];
  const images = buildImageMap(objects);
  const items = objects.filter((obj) => obj.type === "ITEM");

  const prisma = assertPrisma();
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  let includeSquareIds: boolean | null = null;

  for (const item of items) {
    const mapped = mapCatalogItem(item, images);
    if (!mapped) {
      skipped += 1;
      continue;
    }

    const baseData: Record<string, unknown> = {
      name: mapped.name,
      price: mapped.price,
    };
    if (mapped.description) {
      baseData.description = mapped.description;
    }
    if (mapped.imageUrl) {
      baseData.imageUrl = mapped.imageUrl;
    }

    const squareData = {
      squareCatalogId: mapped.squareCatalogId,
      squareItemId: mapped.squareItemId,
      squareVariationId: mapped.squareVariationId,
    };

    const data = includeSquareIds === false ? baseData : { ...baseData, ...squareData };

    try {
      await prisma.fragranceProduct.update({
        where: { sku: mapped.sku },
        data: data as Record<string, unknown>,
      });
      updated += 1;
    } catch (error) {
      if (isPrismaError(error, "P2022")) {
        includeSquareIds = false;
        try {
          await prisma.fragranceProduct.update({
            where: { sku: mapped.sku },
            data: baseData as Record<string, unknown>,
          });
          updated += 1;
          continue;
        } catch (retryError) {
          if (isPrismaError(retryError, "P2025")) {
            skipped += 1;
            continue;
          }
          errors += 1;
          continue;
        }
      }
      if (isPrismaError(error, "P2025")) {
        skipped += 1;
        continue;
      }
      errors += 1;
    }
  }

  console.log(
    `[SquareCatalog] env=${getSquareEnvironmentName()} total=${items.length} updated=${updated} skipped=${skipped} errors=${errors}`
  );

  return {
    total: items.length,
    updated,
    skipped,
    errors,
  };
};
