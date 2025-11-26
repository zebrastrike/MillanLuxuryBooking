import { assertPrisma } from "../server/db/prismaClient";
import { insertContactMessageSchema } from "../shared/types";
import { ensureParsedBody, handleUnknownError, methodNotAllowed, requireAdmin } from "./_utils";

const prisma = assertPrisma();

export default async function handler(req: any, res: any) {
  if (req.method === "GET") {
    try {
      const user = await requireAdmin(req, res, prisma);
      if (!user) return;

      const messages = await prisma.contactMessage.findMany({ orderBy: { timestamp: "desc" } });
      res.status(200).json(messages);
    } catch (error) {
      handleUnknownError(res, error, "Failed to retrieve contact messages");
    }
    return;
  }

  if (req.method === "POST") {
    try {
      const payload = insertContactMessageSchema.parse(ensureParsedBody(req));
      const message = await prisma.contactMessage.create({ data: payload });
      res.status(201).json({ success: true, message: "Contact form submitted successfully", data: message });
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        res.status(400).json({ success: false, message: "Invalid form data", errors: error });
        return;
      }
      handleUnknownError(res, error, "Failed to submit contact form");
    }
    return;
  }

  methodNotAllowed(res, ["GET", "POST"]);
}
