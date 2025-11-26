import { put } from "@vercel/blob";
import { getAuth } from "@clerk/vercel";

export const config = {
  api: {
    bodyParser: false,
  },
};

function sanitizePrefix(prefix: string | null): string {
  if (!prefix) return "uploads/";
  const cleaned = prefix.replace(/^\/+|\/+$/g, "");
  return cleaned ? `${cleaned}/` : "uploads/";
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ message: "Method Not Allowed" });
    return;
  }

  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN ?? process.env.Blob_Evans_READ_WRITE_TOKEN;
  if (!token) {
    res.status(500).json({ message: "Blob token is not configured" });
    return;
  }

  try {
    const buffers: Buffer[] = [];
    for await (const chunk of req) {
      buffers.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }

    const fileBuffer = Buffer.concat(buffers);
    if (!fileBuffer.length) {
      res.status(400).json({ message: "No file received" });
      return;
    }

    const contentType = req.headers["content-type"] as string | undefined;
    const rawFilename = (req.headers["x-file-name"] as string | undefined) ?? `upload-${Date.now()}`;
    const safeName = rawFilename.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9_.-]/g, "");
    const prefix = sanitizePrefix((req.query?.prefix as string | undefined) ?? null);
    const key = `${prefix}${Date.now()}-${safeName || "file"}`;

    const blob = await put(key, fileBuffer, { access: "public", token, contentType });
    res.status(200).json({ url: blob.url, pathname: blob.pathname });
  } catch (error) {
    console.error("Upload failed", error);
    res.status(500).json({ message: "Failed to upload file" });
  }
}
