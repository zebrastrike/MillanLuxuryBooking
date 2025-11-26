import { prisma } from "../../lib/prisma";
import { getAuth } from "@clerk/vercel";
import { methodNotAllowed } from "../_utils";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    methodNotAllowed(res, ["GET"]);
    return;
  }

  try {
    const auth = getAuth(req);
    const includeDrafts = ["1", "true", "admin"].includes(String(req.query?.admin ?? ""));
    const where = includeDrafts && auth?.userId ? {} : { published: true };
    const posts = await prisma.post.findMany({ where, orderBy: { createdAt: "desc" } });
    res.status(200).json(posts);
  } catch (error) {
    console.error("Failed to load blog posts", error);
    res.status(500).json({ message: "Failed to load blog posts" });
  }
}
