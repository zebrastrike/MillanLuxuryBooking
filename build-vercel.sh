#!/bin/bash
# Vercel build wrapper script
# Fixes path normalization issue where "client" gets corrupted to "cline"

set -e

echo "Starting Vercel build..."
echo "Node version: $(node --version)"
echo "Current directory: $(pwd)"

if [ -z "$DATABASE_URL" ]; then
  echo "Skipping Prisma setup because DATABASE_URL is not set."
else
  echo "Skipping migrations (tables already exist in production)..."
  echo "Generating Prisma client..."
  npx prisma generate --schema=prisma/schema.prisma
fi

# Run the standard build command
npm run build

echo "Build completed successfully!"
