# Build stage — build design system + Storybook static site
FROM node:24-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate

WORKDIR /app

# Copy workspace config files first for layer caching
COPY pnpm-lock.yaml pnpm-workspace.yaml .npmrc package.json ./
# Copy pnpm patches so they are applied during install
COPY patches/ ./patches/
# Copy package.json for the design-system package
COPY packages/design-system/package.json ./packages/design-system/

# Install dependencies (--ignore-scripts prevents prepublishOnly from firing
# before source/tsconfig files are copied into the image)
RUN pnpm install --frozen-lockfile --ignore-scripts

# Cache-bust: everything below here rebuilds when source changes.
# Pass --build-arg CACHEBUST=$(date +%s) to force a fresh build.
ARG CACHEBUST=0

# Storyblok Preview API token — injected at build time by Vite `define`
# so the theme switcher can fetch CMS themes from the CDN API.
ARG STORYBLOK_API_TOKEN
ENV STORYBLOK_API_TOKEN=${STORYBLOK_API_TOKEN}

# Copy source code
COPY packages/design-system/ ./packages/design-system/

# Build Storybook (tokens → schema → token extraction → search index → storybook build)
RUN cd packages/design-system && pnpm run build-storybook

# Serve stage — minimal nginx to serve static Storybook
FROM nginx:alpine AS production

LABEL org.opencontainers.image.source="https://github.com/kickstartDS/ruhmesmeile-storyblok-starter"
LABEL org.opencontainers.image.description="kickstartDS Design System Storybook"

# Custom nginx config for port 8080 and SPA routing
RUN printf 'server {\n\
    listen 8080;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
    # Cache static assets aggressively\n\
    location ~* \\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$ {\n\
        expires 30d;\n\
        add_header Cache-Control "public, immutable";\n\
    }\n\
    # Gzip compression\n\
    gzip on;\n\
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;\n\
}\n' > /etc/nginx/conf.d/default.conf

# Copy Storybook static output
COPY --from=builder /app/packages/design-system/storybook-static /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:8080/ || exit 1
