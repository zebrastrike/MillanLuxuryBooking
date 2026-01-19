import type { CatalogObject } from "square";
import { assertPrisma } from "../db/prismaClient.js";
import { createSquareClient, getSquareEnvironmentName } from "./square.js";
import { resolveSquareAccessToken } from "./squareAccess.js";

type CatalogSyncResult = {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  services: number;
  products: number;
};

type MappedItem = {
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  squareCatalogId: string;
  squareVariationId: string;
  isService: boolean;
};

const PRODUCT_KEYWORDS = ["candle", "diffuser", "spray", "cleaner"];
// Service keywords to identify cleaning services
const SERVICE_KEYWORDS = [
  "cleaning",
  "move-in",
  "move-out",
  "laundry",
  "comforter",
  "bed sheet",
  "add-on",
  "deep clean",
  "basic",
];

const requireSquareSyncEnabled = () => {
  if (process.env.SQUARE_SYNC_ENABLED !== "true") {
    throw new Error("Square sync not enabled");
  }
  if (process.env.SQUARE_ENABLED !== "true") {
    throw new Error("Square not enabled");
  }
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

const isServiceItem = (name: string): boolean => {
  const lowerName = name.toLowerCase();
  if (PRODUCT_KEYWORDS.some((keyword) => lowerName.includes(keyword))) {
    return false;
  }
  return SERVICE_KEYWORDS.some(keyword => lowerName.includes(keyword));
};

const mapCatalogItem = (item: CatalogObject, images: Map<string, string>): MappedItem | null => {
  if (item.type !== "ITEM" || !item.itemData?.variations?.length) {
    return null;
  }

  const name = item.itemData.name?.trim();
  if (!name) {
    return null;
  }
  const itemId = item.id;
  if (!itemId) {
    return null;
  }

  // Find first variation with a price
  const variation = item.itemData.variations.find((v: CatalogObject) => {
    const varData = (v as CatalogObject & { itemVariationData?: { priceMoney?: { amount?: bigint | number } } })
      .itemVariationData;
    return varData?.priceMoney?.amount != null;
  });

  // Get price (default to 0 if no variation with price)
  let price = 0;
  let variationId = item.itemData.variations[0]?.id || itemId;

  const variationData = variation
    ? (variation as CatalogObject & { itemVariationData?: { priceMoney?: { amount?: bigint | number } } })
        .itemVariationData
    : null;
  if (variationData?.priceMoney?.amount != null) {
    const amount = variationData.priceMoney.amount;
    price = (typeof amount === "bigint" ? Number(amount) : amount) / 100;
    variationId = variation?.id || variationId;
  }

  const imageId = item.itemData.imageIds?.[0];
  const imageUrl = imageId ? images.get(imageId) ?? null : null;

  return {
    name,
    description: item.itemData.description?.trim() ?? null,
    price,
    imageUrl,
    squareCatalogId: itemId,
    squareVariationId: variationId,
    isService: isServiceItem(name),
  };
};

const categorizeProduct = (name: string): string => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes("3 wick") || lowerName.includes("3-wick")) return "candle-3wick";
  if (lowerName.includes("mini")) return "candle-mini";
  if (lowerName.includes("single")) return "candle-single";
  if (lowerName.includes("diffuser") || lowerName.includes("car")) return "car-diffuser";
  if (lowerName.includes("spray") || lowerName.includes("room")) return "room-spray";
  if (lowerName.includes("cleaner") || lowerName.includes("multipurpose")) return "cleaner";
  return "other";
};

export const importSquareCatalog = async (): Promise<CatalogSyncResult> => {
  requireSquareSyncEnabled();
  const accessToken = await resolveSquareAccessToken();
  const client = createSquareClient(accessToken);

  // Fetch all catalog items with pagination
  const allItems: CatalogObject[] = [];
  let cursor: string | undefined;

  do {
    const result = await client.catalog.list({ cursor });
    if (result.data?.length) {
      for (const obj of result.data) {
        if (obj.type === "ITEM") {
          allItems.push(obj);
        }
      }
    }
    cursor = result.response?.cursor;
  } while (cursor);

  // Fetch images separately (catalog.list doesn't return IMAGE type by default)
  const allImages: CatalogObject[] = [];
  cursor = undefined;

  do {
    const result = await client.catalog.list({ cursor, types: ["IMAGE"] });
    if (result.data?.length) {
      for (const obj of result.data) {
        allImages.push(obj);
      }
    }
    cursor = result.response?.cursor;
  } while (cursor);

  console.log(`[SquareCatalog] Fetched ${allItems.length} items and ${allImages.length} images`);

  const images = buildImageMap(allImages);
  const items = allItems;

  const prisma = assertPrisma();
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  let services = 0;
  let products = 0;

  for (const item of items) {
    const mapped = mapCatalogItem(item, images);
    if (!mapped) {
      skipped += 1;
      continue;
    }

    try {
      if (mapped.isService) {
        await prisma.fragranceProduct.deleteMany({
          where: { squareCatalogId: mapped.squareCatalogId },
        });

        // Upsert as ServiceItem
        const existing = await prisma.serviceItem.findFirst({
          where: { squareServiceId: mapped.squareCatalogId }
        });

        if (existing) {
          await prisma.serviceItem.update({
            where: { id: existing.id },
            data: {
              title: mapped.name,
              description: mapped.description || `Professional ${mapped.name} service`,
              price: mapped.price,
              imageUrl: mapped.imageUrl,
              isVisible: true,
              displayPrice: true,
            }
          });
          updated += 1;
        } else {
          await prisma.serviceItem.create({
            data: {
              title: mapped.name,
              description: mapped.description || `Professional ${mapped.name} service`,
              price: mapped.price,
              imageUrl: mapped.imageUrl,
              squareServiceId: mapped.squareCatalogId,
              isVisible: true,
              displayPrice: true,
            }
          });
          created += 1;
        }
        services += 1;
      } else {
        await prisma.serviceItem.deleteMany({
          where: { squareServiceId: mapped.squareCatalogId },
        });

        // Upsert as FragranceProduct
        const existing = await prisma.fragranceProduct.findFirst({
          where: { squareCatalogId: mapped.squareCatalogId }
        });

        const category = categorizeProduct(mapped.name);

        if (existing) {
          await prisma.fragranceProduct.update({
            where: { id: existing.id },
            data: {
              name: mapped.name,
              description: mapped.description || `Luxury ${mapped.name}`,
              price: mapped.price,
              imageUrl: mapped.imageUrl,
              isVisible: true,
              displayPrice: true,
            }
          });
          updated += 1;
        } else {
          await prisma.fragranceProduct.create({
            data: {
              name: mapped.name,
              description: mapped.description || `Luxury ${mapped.name}`,
              category,
              fragrance: "Signature",
              price: mapped.price,
              imageUrl: mapped.imageUrl,
              squareUrl: `https://millanluxurycleaning.square.site/`,
              squareCatalogId: mapped.squareCatalogId,
              squareItemId: mapped.squareCatalogId,
              squareVariationId: mapped.squareVariationId,
              isVisible: true,
              displayPrice: true,
            }
          });
          created += 1;
        }
        products += 1;
      }
    } catch (error) {
      console.error(`[SquareCatalog] Error processing ${mapped.name}:`, error);
      errors += 1;
    }
  }

  console.log(
    `[SquareCatalog] env=${getSquareEnvironmentName()} total=${items.length} created=${created} updated=${updated} skipped=${skipped} errors=${errors} (services=${services}, products=${products})`
  );

  return {
    total: items.length,
    created,
    updated,
    skipped,
    errors,
    services,
    products,
  };
};
