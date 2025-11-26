import { ZodError } from "zod";
import { getAuth } from "@clerk/vercel";
import { prisma } from "../../lib/prisma";
import { insertPostSchema } from "../../shared/types";
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
    const data = insertPostSchema.parse(payload);
    const post = await prisma.post.create({ data });
    res.status(201).json(post);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ message: "Invalid post data", errors: error.issues });
      return;
    }

    console.error("Failed to create blog post", error);
    res.status(500).json({ message: "Failed to create blog post" });
  }
}
