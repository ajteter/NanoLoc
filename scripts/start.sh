#!/bin/sh
set -e

# ──────────────────────────────────────────────────────────────────────────────
# NanoLoc Auto-Healing Startup Script
# Runs as root to fix volume permissions, then drops to nextjs user via gosu.
# ──────────────────────────────────────────────────────────────────────────────

# 1. Fix Volume Permissions (runs as root)
echo "🔧 Fixing permissions for /app/prisma/data..."
mkdir -p /app/prisma/data
chown -R nextjs:nodejs /app/prisma/data
chmod -R 775 /app/prisma/data

# 2. Run Migrations (as nextjs user)
echo "🚀 Running database migrations..."
gosu nextjs npx prisma migrate deploy

# 3. Start Server (as nextjs user, exec replaces shell PID)
echo "✅ Starting NanoLoc server as nextjs user..."
exec gosu nextjs node server.js
