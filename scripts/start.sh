#!/bin/sh
set -e
echo "🚀 Running database migrations..."
npx prisma migrate deploy
echo "✅ Starting NanoLoc server..."
exec node server.js
