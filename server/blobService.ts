import type { Express } from "express";
import { del as deleteBlob, list as listBlobs, put } from "@vercel/blob";
import { loadEnv } from "./env";

const ROOT_PREFIX = "static/";

const env = loadEnv();

function assertBlobToken(): string {
  if (!env.blob.token) {
    throw new Error("Blob token not configured");
  }

  return env.blob.token;
}

function normalizePrefix(folderPrefix: string): string {
  const cleaned = folderPrefix.replace(/^\/+|\/+$/g, "");
  if (!cleaned) return ROOT_PREFIX;

  const withRoot = cleaned.startsWith(ROOT_PREFIX) ? cleaned : `${ROOT_PREFIX}${cleaned}`;
  return withRoot.endsWith("/") ? withRoot : `${withRoot}/`;
}

export type BlobImage = {
  url: string;
  pathname: string;
  size?: number;
  uploadedAt?: string;
};

export async function list(folderPrefix: string): Promise<BlobImage[]> {
  const token = assertBlobToken();
  const prefix = normalizePrefix(folderPrefix);
  const { blobs = [] } = await listBlobs({ token, prefix });

  return blobs.map((blob) => ({
    url: blob.url,
    pathname: blob.pathname,
    size: typeof (blob as any).size === "number" ? (blob as any).size : undefined,
    uploadedAt: (blob as any).uploadedAt ? new Date((blob as any).uploadedAt).toISOString() : undefined,
  }));
}

export async function upload(folderPrefix: string, file: Express.Multer.File): Promise<BlobImage> {
  const token = assertBlobToken();
  const prefix = normalizePrefix(folderPrefix);
  const filename = file.originalname.replace(/\s+/g, "-");
  const key = `${prefix}${Date.now()}-${filename}`;

  const blob = await put(key, file.buffer, {
    access: "public",
    token,
    contentType: file.mimetype,
  });

  return {
    url: blob.url,
    pathname: blob.pathname,
    size: file.size,
  };
}

export async function remove(pathOrUrl: string | string[]): Promise<void> {
  const token = assertBlobToken();
  await deleteBlob(pathOrUrl, { token });
}
