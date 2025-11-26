import { ZodError } from "zod";
import { assertPrisma } from "../../server/db/prismaClient";
import { updateServiceSchema } from "../../shared/types";
import { ensureDatabase, ensureParsedBody, handleUnknownError, methodNotAllowed, parseIdParam, requireAdmin } from "../_utils";

export default async function handler(req: any, res: any) {
  if (!ensureDatabase(res)) return;
  const prisma = assertPrisma();

  const id = parseIdParam(req.query?.id);
  if (!id) {
    res.status(400).json({ success: false, message: "Invalid ID" });
    return;
  }

  if (req.method === "PATCH") {
    try {
      const user = await requireAdmin(req, res, prisma);
      if (!user) return;

      const updates = updateServiceSchema.parse(ensureParsedBody(req));
      const existing = await prisma.serviceItem.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ success: false, message: "Service not found" });
        return;
      }

      const item = await prisma.serviceItem.update({ where: { id }, data: updates });
      res.status(200).json({ success: true, message: "Service updated successfully", data: item });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, message: "Invalid service data", errors: error.issues });
        return;
      }
      handleUnknownError(res, error, "Failed to update service");
    }
    return;
  }

  if (req.method === "DELETE") {
    try {
      const user = await requireAdmin(req, res, prisma);
      if (!user) return;

      const existing = await prisma.serviceItem.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ success: false, message: "Service not found" });
        return;
      }

      await prisma.serviceItem.delete({ where: { id } });
      res.status(200).json({ success: true, message: "Service deleted successfully" });
    } catch (error) {
      handleUnknownError(res, error, "Failed to delete service");
    }
    return;
  }

  methodNotAllowed(res, ["PATCH", "DELETE"]);
}
