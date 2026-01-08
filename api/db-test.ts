// Database connection test endpoint
export default async function handler(req: any, res: any) {
  console.log('[DB-Test] Starting database test...');

  try {
    // Try to import and use Prisma
    console.log('[DB-Test] Importing Prisma client...');
    const { prisma, assertPrisma } = await import('../dist/server/db/prismaClient.js');

    console.log('[DB-Test] Prisma imported, checking connection...');
    const db = assertPrisma();

    console.log('[DB-Test] Attempting to query services...');
    const services = await db.serviceItem.findMany({ take: 1 });
    console.log('[DB-Test] Query successful, found', services.length, 'services');

    res.status(200).json({
      status: 'ok',
      message: 'Database connection successful',
      sampleData: services,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[DB-Test] Database test failed:', error);
    console.error('[DB-Test] Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('[DB-Test] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[DB-Test] Error stack:', error instanceof Error ? error.stack : 'No stack');

    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : undefined,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  }
}
