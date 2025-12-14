#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
SCHEMA_FILE="$ROOT_DIR/db/schema.sql"

if ! command -v psql >/dev/null 2>&1; then
  cat <<'MSG'
psql is not installed. Please install it using one of the following methods:
  - macOS (Homebrew): brew install libpq && brew link --force libpq
  - Windows: Install PostgreSQL from https://www.postgresql.org/download/windows/ and ensure psql is on your PATH
  - Ubuntu/Debian: sudo apt-get update && sudo apt-get install -y postgresql-client
MSG
  exit 1
fi

if [ -f "$ENV_FILE" ]; then
  set -o allexport
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +o allexport
else
  echo "Warning: .env file not found at $ENV_FILE"
fi

if [ -z "${DATABASE_DIRECT_URL:-}" ]; then
  echo "Error: DATABASE_DIRECT_URL is not set. Please add it to $ENV_FILE."
  exit 1
fi

if [ ! -f "$SCHEMA_FILE" ]; then
  echo "Error: schema file not found at $SCHEMA_FILE"
  exit 1
fi

echo "Pushing schema from $SCHEMA_FILE to the database..."
if psql "$DATABASE_DIRECT_URL" -f "$SCHEMA_FILE"; then
  echo "Schema push completed successfully."
else
  echo "Schema push failed. Please review the errors above."
  exit 1
fi
