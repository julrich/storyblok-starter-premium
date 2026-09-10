# Build stage
FROM node:24-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate

WORKDIR /app

# Copy workspace config files first for layer caching
COPY pnpm-lock.yaml pnpm-workspace.yaml .npmrc package.json ./
# Copy pnpm patches so they are applied during install
COPY patches/ ./patches/
# Copy package.json files for required workspace packages
COPY packages/storyblok-services/package.json ./packages/storyblok-services/
COPY packages/shared-auth/package.json ./packages/shared-auth/
COPY packages/storyblok-mcp/package.json ./packages/storyblok-mcp/
COPY packages/design-system/package.json ./packages/design-system/

# Install dependencies (--ignore-scripts prevents prepublishOnly from firing
# before source/tsconfig files are copied into the image)
RUN pnpm install --frozen-lockfile --ignore-scripts

# Cache-bust: everything below here rebuilds when source changes.
# Pass --build-arg CACHEBUST=$(date +%s) to force a fresh build.
ARG CACHEBUST=0

# Copy source code
COPY packages/shared-auth/ ./packages/shared-auth/
COPY packages/storyblok-services/ ./packages/storyblok-services/
COPY packages/storyblok-mcp/ ./packages/storyblok-mcp/

# Copy pre-built design-system dist (needed for token extraction and SSR
# component bundling). Component JS bundles reference shared chunks at the
# dist root (e.g. helpers-*.js), so the entire dist/ tree is required.
# static/ (screenshots, ~105 MB) is excluded via .dockerignore.
# Requires: pnpm --filter @kickstartds/design-system build  before deploying.
COPY packages/design-system/dist/ ./packages/design-system/dist/

# Build shared lib first, then MCP server
RUN pnpm --filter @kickstartds/shared-auth run build
RUN pnpm --filter @kickstartds/storyblok-services run build

# With injectWorkspacePackages the workspace dep is copied (not symlinked)
# during install. Re-install so the injected copy includes the built dist/.
RUN pnpm install --frozen-lockfile --ignore-scripts

RUN pnpm --filter @kickstartds/storyblok-mcp-server run build

# Production stage — use pnpm deploy for a pruned, self-contained bundle
FROM node:24-alpine AS production
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate

WORKDIR /app

# Copy full workspace and deploy a pruned production bundle
COPY --from=builder /app ./
RUN pnpm --filter @kickstartds/storyblok-mcp-server deploy --prod /prod/mcp-server

WORKDIR /prod/mcp-server

# Copy runtime assets (schemas and skill docs)
COPY packages/storyblok-mcp/schemas/ ./schemas/
COPY docs/skills/ ./skills/

# Set environment variables (these should be overridden at runtime)
ENV NODE_ENV=production
ENV MCP_TRANSPORT=http
ENV MCP_PORT=8080
ENV STORYBLOK_API_TOKEN=""
ENV STORYBLOK_OAUTH_TOKEN=""
ENV STORYBLOK_SPACE_ID=""
ENV OPENAI_API_KEY=""

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
