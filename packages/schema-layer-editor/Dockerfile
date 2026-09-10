# Build stage
FROM node:24-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate

WORKDIR /app

# Copy workspace config files first for layer caching
COPY pnpm-lock.yaml pnpm-workspace.yaml .npmrc package.json ./
# Copy pnpm patches so they are applied during install
COPY patches/ ./patches/
# Copy package.json for the schema-layer-editor
COPY packages/schema-layer-editor/package.json ./packages/schema-layer-editor/

# Install dependencies (--ignore-scripts prevents prepublishOnly from firing
# before source/tsconfig files are copied into the image)
RUN pnpm install --frozen-lockfile --ignore-scripts

# Cache-bust: everything below here rebuilds when source changes.
# Pass --build-arg CACHEBUST=$(date +%s) to force a fresh build.
ARG CACHEBUST=0

# Copy source code
COPY packages/schema-layer-editor/ ./packages/schema-layer-editor/

# Build frontend (vite) and server (tsc)
RUN cd packages/schema-layer-editor && pnpm run build

# Production stage — use pnpm deploy for a pruned, self-contained bundle
FROM node:24-alpine AS production
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate

WORKDIR /app

# Copy full workspace and deploy a pruned production bundle
COPY --from=builder /app ./
RUN pnpm --filter @kickstartds/schema-layer-editor deploy --prod /prod/schema-layer-editor

WORKDIR /prod/schema-layer-editor

# Copy built artifacts (dist/) — pnpm deploy --prod may not include build output
COPY --from=builder /app/packages/schema-layer-editor/dist/ ./dist/

# Copy design-system dereferenced schemas from the build context.
# These are pre-built on the host (via `pnpm --filter design-system run schema`).
COPY packages/design-system/dist/components/ ./schemas/

# Set environment variables
ENV NODE_ENV=production
ENV SCHEMA_LAYER_NAMESPACE=visibility
ENV SCHEMA_LAYER_PORT=8080

# Expose the HTTP port
EXPOSE 8080

# Health check against the schemas API endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:8080/api/schemas || exit 1

# Run as non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S editor -u 1001 -G nodejs

# Create writable output directory for layer files
RUN mkdir -p /prod/schema-layer-editor/output && \
    chown -R editor:nodejs /prod/schema-layer-editor/output

USER editor

# Start the server with baked-in schema path
ENTRYPOINT ["node", "dist/server/cli.js", "--schemas", "./schemas", "--namespace", "visibility", "--output", "./output", "--port", "8080"]
