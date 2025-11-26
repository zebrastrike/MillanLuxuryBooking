import { assertPrisma, hasDatabaseUrl } from "../server/db/prismaClient";

// Basic health/info endpoint for Vercel serverless runtime
export default async function handler(_req: any, res: any) {
  if (!hasDatabaseUrl) {
    res.status(503).json({
      message: "Database connection is not configured. Set DATABASE_URL to enable API routes.",
    });
    return;
  }

  try {
    assertPrisma();
    res.status(200).json({
      name: "Millan Luxury Cleaning API",
      status: "ok",
      note: "Serverless functions powered by Vercel",
    });
  } catch (error) {
    console.error("API bootstrap error", error);
    res.status(500).json({ message: "API not ready" });
  }
}
