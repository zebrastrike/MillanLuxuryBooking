import { ZodError } from "zod";
import { getAuth } from "@clerk/vercel";
import { prisma } from "../../lib/prisma";
import { updatePostSchema } from "../../shared/types";
import { ensureParsedBody, methodNotAllowed, parseIdParam } from "../_utils";

export default async function handler(req: any, res: any) {
  const id = parseIdParam(req.query?.id);

  if (!id) {
    res.status(400).json({ message: "Invalid post id" });
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
      await prisma.post.delete({ where: { id } });
      res.status(204).end();
    } catch (error) {
      console.error("Failed to delete post", error);
      res.status(500).json({ message: "Failed to delete post" });
    }
    return;
  }

  try {
    const payload = ensureParsedBody(req);
    const data = updatePostSchema.parse(payload);
    const post = await prisma.post.update({ where: { id }, data: { ...data, updatedAt: new Date() } });
    res.status(200).json(post);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ message: "Invalid post data", errors: error.issues });
      return;
    }

    console.error("Failed to update post", error);
    res.status(500).json({ message: "Failed to update post" });
  }
}
