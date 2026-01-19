import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

export const getEncryptionKey = () => {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("ENCRYPTION_KEY not configured");
  }
  const key = Buffer.from(raw, "hex");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be 32 bytes hex");
  }
  return key;
};

export const encrypt = (value: string) => {
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-cbc", getEncryptionKey(), iv);
  let encrypted = cipher.update(value, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
};

export const decrypt = (value: string) => {
  const [ivHex, encryptedHex] = value.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = createDecipheriv("aes-256-cbc", getEncryptionKey(), iv);
  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};
