import { ZodError } from "zod";
import { getAuth } from "@clerk/vercel";
import { prisma } from "../../lib/prisma";
import { insertServiceSchema } from "../../shared/types";
import { ensureParsedBody, methodNotAllowed } from "../_utils";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    methodNotAllowed(res, ["POST"]);
    return;
  }

  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  try {
    const payload = ensureParsedBody(req);
    const data = insertServiceSchema.parse(payload);
    const maxOrder = await prisma.serviceItem.aggregate({ _max: { order: true } });
    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    const item = await prisma.serviceItem.create({
      data: {
        ...data,
        title: (data as any).title ?? (data as any).name ?? "",
        name: (data as any).name ?? (data as any).title ?? "",
        order: data.order ?? nextOrder,
      },
    });

    res.status(201).json(item);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ message: "Invalid service data", errors: error.issues });
      return;
    }

    console.error("Failed to create service", error);
    res.status(500).json({ message: "Failed to create service" });
  }
}
