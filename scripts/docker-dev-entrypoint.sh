#!/bin/sh

set -e

if [ ! -d node_modules ] || [ ! -f node_modules/.bin/tsx ]; then
  echo "Installing npm dependencies..."
  npm install
fi

if [ "${SKIP_DB_SETUP:-0}" != "1" ]; then
  echo "Waiting for database to become ready..."
  node ./scripts/wait-for-db.cjs

  DB_FLAG_FILE=".db_schema_pushed"
  if [ ! -f "$DB_FLAG_FILE" ] || [ "${FORCE_DB_PUSH:-0}" = "1" ]; then
    echo "Running database migrations (npm run db:push)..."
    npm run db:push
    touch "$DB_FLAG_FILE"
  else
    echo "Database schema already pushed (remove $DB_FLAG_FILE to re-run)"
  fi
fi

exec npm run dev
