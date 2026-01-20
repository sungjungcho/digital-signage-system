# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build Next.js application
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy necessary files
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/package.json ./

# Copy WebSocket server files and dependencies
COPY --from=builder /app/wsServerEntry.js ./
COPY --from=builder /app/src/lib/*.js ./src/lib/
COPY --from=builder /app/node_modules ./node_modules

# Create data directory for database (will be mounted as volume)
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

# Create uploads directory
RUN mkdir -p /app/public/uploads && chown -R nextjs:nodejs /app/public/uploads

USER nextjs

EXPOSE 3000
EXPOSE 8080

# Initialize database and start services (WebSocket server as JavaScript)
CMD ["sh", "-c", "node scripts/init-db.js && node server.js & node wsServerEntry.js"]
