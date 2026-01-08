// Simple health check endpoint to debug initialization
export default async function handler(req: any, res: any) {
  console.log('[Health] Health check called');

  try {
    // Check if we can import the server
    console.log('[Health] Attempting to import server...');
    const { default: initializeApp } = await import('../dist/index.js');
    console.log('[Health] Server imported successfully');

    // Try to initialize
    console.log('[Health] Attempting to initialize app...');
    const app = await initializeApp();
    console.log('[Health] App initialized successfully');

    // Check environment variables
    const envCheck = {
      DATABASE_URL: !!process.env.DATABASE_URL,
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: !!process.env.VERCEL,
    };

    res.status(200).json({
      status: 'ok',
      message: 'Server initialization successful',
      environment: envCheck,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Health] Error during health check:', error);
    console.error('[Health] Error stack:', error instanceof Error ? error.stack : 'No stack');

    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  }
}
