# ── Stage 1: Dependencies ──
FROM node:20-alpine AS deps

# Install system dependencies required by Prisma and native modules
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Install dependencies — delete lockfile to force resolution of correct
# platform-native bindings (lightningcss / Tailwind v4 on Alpine musl)
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN rm -f package-lock.json
RUN npm install

# ── Stage 2: Builder ──
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js
RUN npm run build

# ── Stage 3: Runner (Production) ──
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install minimal runtime dependencies: openssl (Prisma) + su-exec (privilege de-escalation)
RUN apk add --no-cache openssl su-exec

# Create non-root user (container starts as root for permission fixing)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next && chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy prisma schema/migrations + generated client for deployment
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Copy start script
COPY --from=builder /app/scripts/start.sh ./scripts/start.sh

# Grant execute permission and fix CRLF (Windows) line endings
RUN chmod +x ./scripts/start.sh && sed -i 's/\r$//' ./scripts/start.sh

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Container starts as root — start.sh handles permission fixing then drops to nextjs
CMD ["./scripts/start.sh"]
