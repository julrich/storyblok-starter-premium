# Build stage
FROM node:24-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate

WORKDIR /app

# Copy workspace config files first for layer caching
COPY pnpm-lock.yaml pnpm-workspace.yaml .npmrc package.json ./
# Copy pnpm patches so they are applied during install
COPY patches/ ./patches/
# Copy package.json for the component-builder-mcp package
COPY packages/shared-auth/package.json ./packages/shared-auth/
COPY packages/component-builder-mcp/package.json ./packages/component-builder-mcp/

# Install dependencies
RUN pnpm install --frozen-lockfile --ignore-scripts

# Cache-bust: everything below here rebuilds when source changes.
# Pass --build-arg CACHEBUST=$(date +%s) to force a fresh build.
ARG CACHEBUST=0

# Copy source code
COPY packages/shared-auth/ ./packages/shared-auth/
COPY packages/component-builder-mcp/ ./packages/component-builder-mcp/

# Build shared auth, then TypeScript
RUN pnpm --filter @kickstartds/shared-auth run build
RUN pnpm --filter @kickstartds/component-builder-mcp run build

# Production stage — use pnpm deploy for a pruned, self-contained bundle
FROM node:24-alpine AS production
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate

WORKDIR /app

# Copy full workspace and deploy a pruned production bundle
COPY --from=builder /app ./
RUN pnpm --filter @kickstartds/component-builder-mcp deploy --prod /prod/component-builder-mcp

WORKDIR /prod/component-builder-mcp

# Set environment variables
ENV NODE_ENV=production
ENV MCP_TRANSPORT=http
ENV MCP_PORT=8080

# Expose the HTTP port
EXPOSE 8080

# Health check against the /health endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1

# Run as non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mcp -u 1001 -G nodejs

USER mcp

# Start in HTTP mode
ENTRYPOINT ["node", "dist/index.js"]
