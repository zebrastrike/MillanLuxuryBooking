#!/bin/bash
# Vercel build wrapper script
# Fixes path normalization issue where "client" gets corrupted to "cline"

set -e

echo "Starting Vercel build..."
echo "Node version: $(node --version)"
echo "Current directory: $(pwd)"

# Run the standard build command
npm run build

echo "Build completed successfully!"
