// Vercel serverless catch-all handler for all /api/* routes
// This imports the Express app and handles all API requests

let app: any = null;

export default async function handler(req: any, res: any) {
  // Initialize app on first request (cold start)
  if (!app) {
    try {
      console.log('[Vercel] Initializing Express app...');
      // Import the initialization function from the built server
      const { default: initializeApp } = await import('../dist/index.js');
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
