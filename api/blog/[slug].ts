import { prisma } from "../../lib/prisma";
import { methodNotAllowed } from "../_utils";

export default async function handler(req: any, res: any) {
  const slug = Array.isArray(req.query?.slug) ? req.query?.slug[0] : req.query?.slug;

  if (!slug) {
    res.status(400).json({ message: "Post slug is required" });
    return;
  }

  if (req.method !== "GET") {
    methodNotAllowed(res, ["GET"]);
    return;
  }

  try {
    const post = await prisma.post.findFirst({ where: { slug, published: true } });

    if (!post) {
      res.status(404).json({ message: "Post not found" });
      return;
    }

    res.status(200).json(post);
  } catch (error) {
    console.error("Failed to load post", error);
    res.status(500).json({ message: "Failed to load post" });
  }
}
