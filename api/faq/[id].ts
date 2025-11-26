import { ZodError } from "zod";
import { getAuth } from "@clerk/vercel";
import { prisma } from "../../lib/prisma";
import { updateFaqSchema } from "../../shared/types";
import { ensureParsedBody, methodNotAllowed, parseIdParam } from "../_utils";

export default async function handler(req: any, res: any) {
  const id = parseIdParam(req.query?.id);

  if (!id) {
    res.status(400).json({ message: "Invalid FAQ id" });
    return;
  }

  if (!req.method || !["PATCH", "DELETE"].includes(req.method)) {
    methodNotAllowed(res, ["PATCH", "DELETE"]);
    return;
  }

  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  if (req.method === "DELETE") {
    try {
      await prisma.faqItem.delete({ where: { id } });
      res.status(204).end();
    } catch (error) {
      console.error("Failed to delete FAQ", error);
      res.status(500).json({ message: "Failed to delete FAQ" });
    }
    return;
  }

  try {
    const payload = ensureParsedBody(req);
    const data = updateFaqSchema.parse(payload);
    const updated = await prisma.faqItem.update({ where: { id }, data });
    res.status(200).json(updated);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ message: "Invalid FAQ data", errors: error.issues });
      return;
    }

    console.error("Failed to update FAQ", error);
    res.status(500).json({ message: "Failed to update FAQ" });
  }
}
