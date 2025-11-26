// Basic health/info endpoint for Vercel serverless runtime
export default async function handler(_req: any, res: any) {
  try {
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
