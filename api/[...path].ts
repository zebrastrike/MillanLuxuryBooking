// Vercel serverless catch-all handler for all /api/* routes
// This imports the Express app and handles all API requests

let app: any = null;

export default async function handler(req: any, res: any) {
  // Load the Express app on first request (cold start)
  if (!app) {
    try {
      console.log('[Vercel] Loading Express app...');
      // Import the Express app from the built server
      const module = await import('../dist/index.js');
      app = module.default;

      // Wait for app initialization to complete
      const maxWait = 5000; // 5 seconds max
      const startTime = Date.now();
      while (!app.isInitialized && Date.now() - startTime < maxWait) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      if (!app.isInitialized) {
        throw new Error('App initialization timeout');
      }

      console.log('[Vercel] Express app loaded and initialized');
    } catch (error) {
      console.error('Failed to load Express app:', error);
      res.status(500).json({
        error: 'Server initialization failed',
        details: error instanceof Error ? error.message : String(error)
      });
      return;
    }
  }

  // Handle the request with Express
  return app(req, res);
}
