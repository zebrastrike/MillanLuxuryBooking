import { prisma } from "../../lib/prisma";
import { methodNotAllowed } from "../_utils";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    methodNotAllowed(res, ["GET"]);
    return;
  }

  try {
    const items = await prisma.serviceItem.findMany({
      orderBy: [
        { order: "asc" },
        { id: "asc" },
      ],
    });
    res.status(200).json(items);
  } catch (error) {
    console.error("Failed to retrieve services", error);
    res.status(500).json({ message: "Failed to retrieve services" });
  }
}
