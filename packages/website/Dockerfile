FROM node:24-alpine AS base

# Disabling Telemetry
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache libc6-compat curl
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate

FROM base AS deps
WORKDIR /app

# Copy workspace config files first for layer caching
COPY pnpm-lock.yaml pnpm-workspace.yaml .npmrc package.json ./
# Copy pnpm patches so they are applied during install
COPY patches/ ./patches/
# Copy package.json files for all workspace packages (pnpm needs the full workspace graph)
COPY packages/component-builder-mcp/package.json ./packages/component-builder-mcp/
COPY packages/design-system/package.json ./packages/design-system/
# Copy pre-built design system dist (injectWorkspacePackages copies it into the store at install time)
COPY packages/design-system/dist/ ./packages/design-system/dist/
COPY packages/design-tokens-editor/package.json ./packages/design-tokens-editor/
COPY packages/design-tokens-mcp/package.json ./packages/design-tokens-mcp/
COPY packages/schema-layer-editor/package.json ./packages/schema-layer-editor/
COPY packages/shared-auth/package.json ./packages/shared-auth/
COPY packages/storyblok-icon-sprite-picker-field-plugin/package.json ./packages/storyblok-icon-sprite-picker-field-plugin/
COPY packages/storyblok-mcp/package.json ./packages/storyblok-mcp/
COPY packages/storyblok-n8n/package.json ./packages/storyblok-n8n/
COPY packages/storyblok-services/package.json ./packages/storyblok-services/
COPY packages/storyblok-sharepoint-folder-picker-field-plugin/package.json ./packages/storyblok-sharepoint-folder-picker-field-plugin/
COPY packages/storyblok-theme-select-field-plugin/package.json ./packages/storyblok-theme-select-field-plugin/
COPY packages/token-graph/package.json ./packages/token-graph/
COPY packages/website/package.json ./packages/website/
RUN pnpm install --frozen-lockfile --ignore-scripts
# Run only native addon postinstall scripts that were skipped above
RUN pnpm rebuild

FROM base AS builder
ARG NEXT_STORYBLOK_SPACE_ID
ENV NEXT_STORYBLOK_SPACE_ID=$NEXT_STORYBLOK_SPACE_ID
ARG NEXT_STORYBLOK_API_TOKEN
ENV NEXT_STORYBLOK_API_TOKEN=$NEXT_STORYBLOK_API_TOKEN
ARG NEXT_STORYBLOK_OAUTH_TOKEN
ENV NEXT_STORYBLOK_OAUTH_TOKEN=$NEXT_STORYBLOK_OAUTH_TOKEN
ARG NEXT_OPENAI_API_KEY
ENV NEXT_OPENAI_API_KEY=$NEXT_OPENAI_API_KEY
# UPSTREAM BUG - deviates from monorepo/main, contribute back and drop.
# `NEXT_PUBLIC_*` values are inlined at build time, so this has to be an ARG.
# Without it the canonical URLs, the breadcrumb JSON-LD and every entry in
# sitemap.xml are built against an undefined origin.
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
WORKDIR /app
COPY --from=deps /app ./

# Cache-bust: everything below here rebuilds when source changes.
# Pass --build-arg CACHEBUST=$(date +%s) to force a fresh build.
ARG CACHEBUST=0

# Copy source for shared lib, MCP schemas, and website
COPY packages/storyblok-services/ ./packages/storyblok-services/
COPY packages/storyblok-mcp/schemas/ ./packages/storyblok-mcp/schemas/
COPY packages/website/ ./packages/website/

# Build shared lib first, then re-inject so the website can resolve it
RUN pnpm --filter @kickstartds/storyblok-services run build
RUN pnpm install --frozen-lockfile --ignore-scripts
RUN pnpm --filter @kickstartds/ruhmesmeile-storyblok-starter run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# With outputFileTracingRoot pointing to the monorepo root, Next.js standalone
# output mirrors the repo structure: .next/standalone/packages/website/server.js
# Copy the entire standalone tree, then layer static + public into the correct subpath.
COPY --from=builder --chown=1001:1001 /app/packages/website/.next/standalone ./
COPY --from=builder --chown=1001:1001 /app/packages/website/.next/static ./packages/website/.next/static
COPY --from=builder --chown=1001:1001 /app/packages/website/public ./packages/website/public
COPY --from=builder --chown=1001:1001 /app/packages/storyblok-mcp/schemas ./packages/storyblok-mcp/schemas

USER nextjs

EXPOSE 3030

ENV PORT=3030
ENV HOSTNAME="0.0.0.0"

CMD ["node", "packages/website/server.js"]
