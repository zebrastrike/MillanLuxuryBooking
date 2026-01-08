import { del, list, put, type PutBlobResult } from "@vercel/blob";
import { loadEnv } from "./env.js";

const env = loadEnv();

function assertBlobToken(): string {
  if (!env.blob.token) {
    throw new Error("Blob token not configured");
  }

  return env.blob.token;
}

/**
 * Upload a file buffer to Vercel Blob using the configured token.
 */
export async function uploadBlob(
  pathname: string,
  data: Buffer,
  options: { access?: "public" } = {},
): Promise<PutBlobResult> {
  const token = assertBlobToken();
  const access: "public" = options.access ?? "public";
  return put(pathname, data, { token, access });
}

/**
 * List blobs within an optional prefix.
 */
export async function listBlobs(prefix?: string): Promise<Awaited<ReturnType<typeof list>>> {
  const token = assertBlobToken();
  return list({ token, prefix });
}

/**
 * Delete a blob by URL or pathname.
 */
export async function deleteBlob(pathOrUrl: string | string[]): Promise<void> {
  const token = assertBlobToken();
  await del(pathOrUrl, { token });
}
