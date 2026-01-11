#!/bin/bash
# Vercel build wrapper script
# Fixes path normalization issue where "client" gets corrupted to "cline"

set -e

echo "Starting Vercel build..."
echo "Node version: $(node --version)"
echo "Current directory: $(pwd)"

# ALWAYS generate Prisma client (doesn't need DB connection, only schema file)
# This prevents runtime errors when Prisma client is missing
echo "Generating Prisma client..."
if npx prisma generate --schema=prisma/schema.prisma; then
  echo "✓ Prisma client generated successfully"
else
  echo "✗ Failed to generate Prisma client"
  exit 1
fi

# Run the standard build command
npm run build

echo "Build completed successfully!"
