# Deployment Guide

This guide explains how to deploy the Design Tokens MCP Server using Docker and Kamal.

## Prerequisites

- Docker installed locally
- [Kamal](https://kamal-deploy.org) installed (`gem install kamal`)
- A server with SSH access (for production deployment)
- GitHub Container Registry access (or another Docker registry)

## Local Development with Docker

### Build and run locally

```bash
# Build the Docker image
docker build -t design-tokens-mcp .

# Run interactively (MCP uses stdio)
docker run -it --rm design-tokens-mcp

# Run with mounted tokens for development
docker run -it --rm -v $(pwd)/tokens:/app/tokens:ro design-tokens-mcp
```

### Using Docker Compose

```bash
# Start the service
docker compose up --build

# Run in detached mode
docker compose up -d --build

# View logs
docker compose logs -f

# Stop the service
docker compose down
```

## Production Deployment with Kamal

### 1. Configure your deployment

Edit `config/deploy.yml` and update:

- `servers.web.hosts` - Your server IP or hostname
- `traefik.*.labels` - Your domain name
- `traefik.args.certificatesResolvers.letsencrypt.acme.email` - Your email for SSL certificates
- `ssh.user` - Your SSH user on the server

### 2. Set up secrets

```bash
# Create secrets file (don't commit this!)
cp .kamal/secrets.example .kamal/secrets

# Edit with your credentials
nano .kamal/secrets
```

Required secrets:

- `KAMAL_REGISTRY_USERNAME` - GitHub username
- `KAMAL_REGISTRY_PASSWORD` - GitHub Personal Access Token with `write:packages` scope

### 3. Set up your server

```bash
# Bootstrap Kamal on your server (first time only)
kamal setup
```

### 4. Deploy

```bash
# Deploy to production
kamal deploy

# View deployment logs
kamal app logs

# Check deployment status
kamal details
```

### 5. Common Kamal commands

```bash
# Rollback to previous version
kamal rollback

# Restart the application
kamal app restart

# Execute command in running container
kamal app exec "node -e 'console.log(process.version)'"

# View Traefik logs
kamal traefik logs

# Remove everything
kamal remove
```

## Verifying the Deployment

After a successful Kamal deploy, you can verify everything is working using cURL from your terminal. Replace `YOUR_DOMAIN` with the domain you configured for `MCP_PUBLIC_DOMAIN`.

### 1. Health check

```bash
curl -s https://YOUR_DOMAIN/health | jq .
```

Expected response:

```json
{
  "status": "ok",
  "version": "4.0.0",
  "tokens": 242
}
```

- `"status": "ok"` — the container is running
- `"tokens"` > 0 — token files were loaded successfully

### 2. MCP initialize (start a session)

Send a JSON-RPC `initialize` request to the `/mcp` endpoint to establish a session:

```bash
curl -si -X POST https://YOUR_DOMAIN/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-03-26",
      "capabilities": {},
      "clientInfo": { "name": "curl-test", "version": "1.0.0" }
    }
  }'
```

Look for a response containing `"serverInfo"` with `"name": "design-tokens-server"` and a `Mcp-Session-Id` response header. Save that session ID for subsequent requests:

```bash
# Extract just the session ID header
curl -si -X POST https://YOUR_DOMAIN/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-03-26",
      "capabilities": {},
      "clientInfo": { "name": "curl-test", "version": "1.0.0" }
    }
  }' 2>&1 | grep -i mcp-session-id
```

### 3. List available tools

Using the session ID from step 2, list all registered tools:

```bash
curl -s -X POST https://YOUR_DOMAIN/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: <SESSION_ID>" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list",
    "params": {}
  }'
```

You should see 16 tools including `get_token`, `get_token_stats`, `get_tokens_by_type`, `get_color_palette`, `get_typography_tokens`, `list_components`, `get_component_tokens`, `search_component_tokens`, etc.

### 4. Call a tool

Test that the server can read and parse token files by calling `get_token_stats`:

```bash
curl -s -X POST https://YOUR_DOMAIN/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: <SESSION_ID>" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "get_token_stats",
      "arguments": {}
    }
  }'
```

This should return token counts by file and category.

### 5. Verify unknown routes return 404

```bash
curl -s https://YOUR_DOMAIN/nonexistent | jq .
```

Expected: `{"error": "Not Found"}`

### Verification checklist

| Check                     | Expected                  | What it confirms                |
| ------------------------- | ------------------------- | ------------------------------- |
| `GET /health` returns 200 | `{"status":"ok", ...}`    | Container is up, tokens loaded  |
| `POST /mcp` initialize    | Server info + session ID  | MCP protocol is working         |
| `tools/list`              | Array of tool definitions | Handler registration is correct |
| `tools/call`              | Token statistics data     | File I/O inside container works |
| Unknown route             | `{"error":"Not Found"}`   | Routing logic is correct        |

## Environment Variables

| Variable        | Description                         | Default      |
| --------------- | ----------------------------------- | ------------ |
| `NODE_ENV`      | Environment mode                    | `production` |
| `MCP_TRANSPORT` | Transport mode: `stdio` or `http`   | `stdio`      |
| `PORT`          | HTTP server port (when `http` mode) | `3000`       |

## Container Registry

The default configuration uses GitHub Container Registry (ghcr.io). To use a different registry:

1. Update `registry.server` in `config/deploy.yml`
2. Update your secrets accordingly

### Using Docker Hub

```yaml
registry:
  server: docker.io
  username:
    - DOCKER_USERNAME
  password:
    - DOCKER_PASSWORD
```

## Health Checks

The container exposes a `/health` endpoint on port 3000 that returns JSON:

```json
{ "status": "ok", "version": "4.0.0", "tokens": 242 }
```

This is used by Docker's `HEALTHCHECK`, Kamal, and load balancers.

## Transport Modes

The server supports two transport modes via the `MCP_TRANSPORT` environment variable:

| Mode    | Use Case                           | Set via                           |
| ------- | ---------------------------------- | --------------------------------- |
| `stdio` | Local MCP clients (Claude Desktop) | Default, or `MCP_TRANSPORT=stdio` |
| `http`  | Cloud / remote deployment via HTTP | `MCP_TRANSPORT=http`              |

In **HTTP mode** the server uses the MCP Streamable HTTP transport (from the `@modelcontextprotocol/sdk`). It:

- Listens on the port specified by `PORT` (default `3000`)
- Exposes `/mcp` for MCP protocol messages (supports SSE streaming)
- Exposes `/health` for health checks
- Manages per-session state with unique session IDs
- Works behind reverse proxies like Traefik (configured via Kamal)

MCP clients connect using a Streamable HTTP URL rather than launching a local process:

```json
{
  "mcpServers": {
    "design-tokens": {
      "type": "streamable-http",
      "url": "https://tokens.yourdomain.com/mcp"
    }
  }
}
```

### Container won't start

```bash
# Check container logs
docker logs design-tokens-mcp

# Run with verbose output
docker run -it --rm -e DEBUG=* design-tokens-mcp
```

### Kamal deployment fails

```bash
# Check Kamal logs
kamal app logs -f

# SSH into server and check Docker
kamal app exec bash
docker ps -a
docker logs <container-id>
```

### SSL certificate issues

```bash
# Check Traefik logs
kamal traefik logs

# Verify DNS is pointing to your server
dig your-domain.com
```

## MCP Server Notes

The server uses the MCP Streamable HTTP transport for cloud deployments, which fully supports:

- Multiple concurrent client sessions
- Server-Sent Events (SSE) for streaming responses
- Standard HTTP load balancing and reverse proxying
- Health checks for orchestration tools (Docker, Kamal, Kubernetes)
