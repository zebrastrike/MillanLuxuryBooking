import { ZodError } from "zod";
import { assertPrisma } from "../server/db/prismaClient";
import { insertGalleryItemSchema } from "../shared/types";
import { ensureParsedBody, handleUnknownError, methodNotAllowed } from "./_utils";

const prisma = assertPrisma();

export default async function handler(req: any, res: any) {
  if (req.method === "GET") {
    try {
      const items = await prisma.galleryItem.findMany({ orderBy: [{ order: "asc" }, { id: "asc" }] });
      res.status(200).json(items);
    } catch (error) {
      handleUnknownError(res, error, "Failed to retrieve gallery items");
    }
    return;
  }

  if (req.method === "POST") {
    try {
      const payload = insertGalleryItemSchema.parse(ensureParsedBody(req));
      const maxOrder = await prisma.galleryItem.aggregate({ _max: { order: true } });
      const nextOrder = (maxOrder._max.order ?? -1) + 1;
      const item = await prisma.galleryItem.create({ data: { ...payload, order: nextOrder } });

      res.status(201).json({ success: true, message: "Gallery item created successfully", data: item });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, message: "Invalid gallery data", errors: { issues: error.issues } });
        return;
      }
      handleUnknownError(res, error, "Failed to create gallery item");
    }
    return;
  }

  methodNotAllowed(res, ["GET", "POST"]);
}
