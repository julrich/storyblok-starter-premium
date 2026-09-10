# Build stage
FROM node:24-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate

WORKDIR /app

# Copy workspace config files first for layer caching
COPY pnpm-lock.yaml pnpm-workspace.yaml .npmrc package.json ./
# Copy pnpm patches so they are applied during install
COPY patches/ ./patches/
# Copy package.json files for the editor and its workspace dependency
COPY packages/design-tokens-editor/package.json ./packages/design-tokens-editor/
COPY packages/shared-auth/package.json ./packages/shared-auth/
COPY packages/design-system/package.json ./packages/design-system/
COPY packages/token-graph/package.json ./packages/token-graph/

# Install dependencies
RUN pnpm install --frozen-lockfile --ignore-scripts

# Cache-bust: everything below here rebuilds when source changes
ARG CACHEBUST=0

# Copy source code for both packages
COPY packages/shared-auth/ ./packages/shared-auth/
COPY packages/design-system/ ./packages/design-system/
COPY packages/token-graph/ ./packages/token-graph/
COPY packages/design-tokens-editor/ ./packages/design-tokens-editor/

# Build shared auth and design system first (tokens needed for tokensToCss)
RUN pnpm --filter @kickstartds/shared-auth run build
RUN cd packages/design-system && pnpm run build

# Re-inject workspace packages so the built dist/ is visible in node_modules
# (injectWorkspacePackages creates a snapshot at install time, which predates the build)
RUN pnpm install --frozen-lockfile --ignore-scripts

# Build frontend (vite → dist/app/) and server (tsc → dist/server/)
RUN cd packages/design-tokens-editor && pnpm run build

# Production stage — use pnpm deploy for a pruned, self-contained bundle
FROM node:24-alpine AS production
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate

WORKDIR /app

# Copy full workspace and deploy a pruned production bundle
COPY --from=builder /app ./
RUN pnpm --filter @kickstartds/design-tokens-editor deploy --prod /prod/design-tokens-editor

WORKDIR /prod/design-tokens-editor

# Copy built artifacts — pnpm deploy --prod may not include build output
COPY --from=builder /app/packages/design-tokens-editor/dist/ ./dist/

# Copy design system token utilities needed at runtime (tokensToCss)
COPY --from=builder /app/packages/design-system/dist/tokens/ ./node_modules/@kickstartds/design-system/dist/tokens/
# Copy static assets (icons, fonts) for the SPA
COPY --from=builder /app/packages/design-system/dist/static/ ./dist/app/

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose the HTTP port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:8080/api/health || exit 1

# Run as non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S editor -u 1001 -G nodejs
USER editor

# Start the Express server
ENTRYPOINT ["node", "dist/server/cli.js"]
