#!/bin/sh
set -e

# 1. Fix Volume Permissions (Runs as root)
# Ensure the mounted data directory is writable by the nextjs user (uid 1001)
echo "🔧 Fixing permissions for /app/prisma/data..."
mkdir -p /app/prisma/data
chown -R nextjs:nodejs /app/prisma/data

# 2. Run Migrations (As nextjs user)
echo "🚀 Running database migrations..."
if command -v gosu >/dev/null 2>&1; then
    gosu nextjs prisma migrate deploy
else
    su nextjs -c "prisma migrate deploy"
fi

# 3. Start Server (As nextjs user)
echo "✅ Starting NanoLoc server as nextjs user..."
if command -v gosu >/dev/null 2>&1; then
    exec gosu nextjs node server.js
else
    exec su nextjs -c "node server.js"
fi
