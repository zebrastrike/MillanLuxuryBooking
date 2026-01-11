// Vercel serverless function handler for Express app
// This imports the Express app and handles all API requests

import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

let app: any = null;

const resolveServerEntry = () => {
  const candidates = [
    path.resolve(process.cwd(), "dist", "server", "index.js"),
    path.resolve(process.cwd(), "..", "dist", "server", "index.js"),
  ];

  const match = candidates.find((candidate) => fs.existsSync(candidate));
  if (!match) {
    throw new Error(`Unable to find server build output. Checked: ${candidates.join(", ")}`);
  }

  return pathToFileURL(match).href;
};

export default async function handler(req: any, res: any) {
  // Load the Express app on first request (cold start)
  if (!app) {
    try {
      console.log('[Vercel] Initializing Express app...');
      // Import the initialization function from the transpiled server
      const { default: initializeApp } = await import(resolveServerEntry());
      // Call the function to get the initialized app
      app = await initializeApp();
      console.log('[Vercel] Express app fully initialized and ready');
    } catch (error) {
      console.error('[Vercel] Failed to initialize Express app:', error);
      console.error('[Vercel] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({
        error: 'Server initialization failed',
        details: error instanceof Error ? error.message : String(error),
        stack: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.stack : undefined
      });
      return;
    }
  }

  // Handle the request with Express
  return app(req, res);
}
