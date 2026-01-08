import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { loadEnv } from "./env";

// Millan Luxury Cleaning - Express Server
// Production-ready application with Clerk authentication and Vercel Blob storage

console.log('[INFO] Starting Millan Luxury Cleaning server...');
console.log('[INFO] Using Clerk for authentication');

const app = express();

// Track initialization status for Vercel serverless
// @ts-ignore
app.isInitialized = false;

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Async initialization Promise for Vercel serverless
const initPromise = (async () => {
  const env = loadEnv();

  const server = await registerRoutes(app, env);

  // Return JSON for any unmatched API routes instead of falling through to HTML
  app.use("/api", (req, res) => {
    res.status(404).json({ message: "API route not found", path: req.path });
  });

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err?.status || err?.statusCode || 500;
    const message = err?.message || "Internal Server Error";
    const wantsJson = req.path.startsWith("/api") || req.headers.accept?.includes("application/json");

    const payload: Record<string, unknown> = { message };

    if (process.env.NODE_ENV !== "production" && err?.stack) {
      payload.stack = err.stack;
    }

    if (wantsJson) {
      res.status(status).json(payload);
      return;
    }

    res.status(status).send(message);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else if (!process.env.VERCEL) {
    // Only serve static files in production non-Vercel environments
    // Vercel handles static files through its CDN
    serveStatic(app);
  }

  // In Vercel (serverless), skip .listen() and export the app instead
  // In local dev, start the server normally
  if (!process.env.VERCEL) {
    const port = env.port;
    server.listen(port, "0.0.0.0", () => {
      log(`serving on port ${port}`);
    });
  } else {
    console.log('[VERCEL] Express app initialized and ready');
  }

  // Return the fully initialized app
  return app;
})();

// For Vercel: export promise that resolves to initialized app
export default initPromise;
