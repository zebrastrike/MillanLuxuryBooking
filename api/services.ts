import { ZodError } from "zod";
import { assertPrisma } from "../server/db/prismaClient";
import { insertServiceSchema } from "../shared/types";
import { ensureDatabase, ensureParsedBody, handleUnknownError, methodNotAllowed, requireAdmin } from "./_utils";

export default async function handler(req: any, res: any) {
  if (!ensureDatabase(res)) return;
  const prisma = assertPrisma();

  if (req.method === "GET") {
    try {
      const items = await prisma.serviceItem.findMany({ orderBy: [{ order: "asc" }, { id: "asc" }] });
      res.status(200).json(items);
    } catch (error) {
      handleUnknownError(res, error, "Failed to retrieve services");
    }
    return;
  }

  if (req.method === "POST") {
    try {
      const user = await requireAdmin(req, res, prisma);
      if (!user) return;

      const payload = insertServiceSchema.parse(ensureParsedBody(req));
      const maxOrder = await prisma.serviceItem.aggregate({ _max: { order: true } });
      const nextOrder = (maxOrder._max.order ?? -1) + 1;
      const item = await prisma.serviceItem.create({
        data: {
          ...payload,
          title: (payload as any).title ?? (payload as any).name ?? "",
          name: (payload as any).name ?? (payload as any).title ?? "",
          order: nextOrder,
        },
      });

      res.status(201).json({ success: true, message: "Service created successfully", data: item });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, message: "Invalid service data", errors: error.issues });
        return;
      }
      handleUnknownError(res, error, "Failed to create service");
    }
    return;
  }

  methodNotAllowed(res, ["GET", "POST"]);
}
