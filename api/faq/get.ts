import { prisma } from "../../lib/prisma";
import { methodNotAllowed } from "../_utils";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    methodNotAllowed(res, ["GET"]);
    return;
  }

  try {
    const faqs = await prisma.faqItem.findMany({
      orderBy: [
        { order: "asc" },
        { id: "asc" },
      ],
    });

    res.status(200).json(faqs);
  } catch (error) {
    console.error("Failed to load FAQ entries", error);
    res.status(500).json({ message: "Failed to load FAQ entries" });
  }
}
