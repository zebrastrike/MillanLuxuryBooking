import { ZodError } from "zod";
import { getAuth } from "@clerk/vercel";
import { prisma } from "../../lib/prisma";
import { updateGalleryItemSchema } from "../../shared/types";
import { ensureParsedBody, handleUnknownError, methodNotAllowed, parseIdParam } from "../_utils";

export default async function handler(req: any, res: any) {
  const id = parseIdParam(req.query?.id);
  if (!id) {
    res.status(400).json({ success: false, message: "Invalid ID" });
    return;
  }

  if (req.method === "GET") {
    try {
      const item = await prisma.galleryItem.findUnique({ where: { id } });
      if (!item) {
        res.status(404).json({ success: false, message: "Gallery item not found" });
        return;
      }
      res.status(200).json({ success: true, data: item });
    } catch (error) {
      handleUnknownError(res, error, "Failed to retrieve gallery item");
    }
    return;
  }

  if (req.method === "PATCH") {
    const auth = getAuth(req);
    if (!auth?.userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }
    try {
      const preprocessedBody: Record<string, unknown> = {};
      const rawBody = ensureParsedBody(req) as Record<string, unknown>;
      for (const [key, value] of Object.entries(rawBody)) {
        if (typeof value === "string" && value.trim() === "") {
          continue;
        }
        preprocessedBody[key] = value;
      }

      const updates = updateGalleryItemSchema.parse(preprocessedBody);
      const existing = await prisma.galleryItem.findUnique({ where: { id } });

      if (!existing) {
        res.status(404).json({ success: false, message: "Gallery item not found" });
        return;
      }

      const item = await prisma.galleryItem.update({ where: { id }, data: updates });
      res.status(200).json({ success: true, message: "Gallery item updated successfully", data: item });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, message: "Invalid gallery data", errors: { issues: error.issues } });
        return;
      }
      if (error instanceof Error && (error.message.includes("Gallery item must have") || error.message.includes("Order must be"))) {
        res.status(400).json({ success: false, message: error.message });
        return;
      }
      handleUnknownError(res, error, "Failed to update gallery item");
    }
    return;
  }

  if (req.method === "DELETE") {
    const auth = getAuth(req);
    if (!auth?.userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }
    try {
      const existing = await prisma.galleryItem.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ success: false, message: "Gallery item not found" });
        return;
      }

      await prisma.galleryItem.delete({ where: { id } });
      res.status(200).json({ success: true, message: "Gallery item deleted successfully" });
    } catch (error) {
      handleUnknownError(res, error, "Failed to delete gallery item");
    }
    return;
  }

  methodNotAllowed(res, ["GET", "PATCH", "DELETE"]);
}
