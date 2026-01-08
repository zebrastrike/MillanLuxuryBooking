// Vercel serverless function handler for Express app
// This imports the Express app and handles all API requests

let app: any = null;

export default async function handler(req: any, res: any) {
  // Load the Express app on first request (cold start)
  if (!app) {
    try {
      console.log('[Vercel] Initializing Express app...');
      // Import the initialization promise from the built server
      const initPromise = await import('../dist/index.js');
      // Await the promise to get the fully initialized app
      app = await initPromise.default;
      console.log('[Vercel] Express app fully initialized and ready');
    } catch (error) {
      console.error('Failed to initialize Express app:', error);
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
