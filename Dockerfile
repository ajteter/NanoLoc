FROM node:20-slim AS base

# Install dependencies only when needed
FROM base AS deps
# Install OpenSSL (required for Prisma)
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
COPY prisma ./prisma
# Delete lockfile to force resolution of Linux bindings (fix for lightningcss/Tailwind v4 on ARM64)
RUN rm -f package-lock.json
RUN npm install

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install openssl for Prisma and gosu for user switching
RUN apt-get update -y && apt-get install -y openssl gosu && rm -rf /var/lib/apt/lists/*

# Install Prisma globally (needed for migrations in production)
RUN npm install -g prisma@6.19.2

# Don't run as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Copy prisma schema/migrations for deployment
COPY --from=builder /app/prisma ./prisma
# Copy start script
COPY --from=builder /app/scripts/start.sh ./scripts/start.sh

# Grant execute permission and fix CRLF (Windows) line endings
RUN chmod +x ./scripts/start.sh && sed -i 's/\r$//' ./scripts/start.sh

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["./scripts/start.sh"]
