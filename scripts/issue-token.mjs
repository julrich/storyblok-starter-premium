#!/usr/bin/env node

/**
 * Issue a signed JWT token for authenticating with hosted kickstartDS services.
 *
 * Usage:
 *   node scripts/issue-token.mjs --user jonas --role admin
 *   node scripts/issue-token.mjs --user "client-acme" --role reader --expires 30d
 *   node scripts/issue-token.mjs --user bot --role admin --expires none
 *
 * Environment:
 *   MCP_JWT_SECRET — HMAC-SHA256 signing secret (reads from env or .env file)
 */

import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const jwt = require("jsonwebtoken");

// ── Parse CLI arguments ─────────────────────────────────────────────

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const value =
        argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
      args[key] = value;
    }
  }
  return args;
}

const args = parseArgs(process.argv);

if (args.help || (!args.user && !args["generate-secret"])) {
  console.log(`
Usage: node scripts/issue-token.mjs --user <name> [--role <role>] [--expires <duration>]

Options:
  --user <name>       User identifier (required)
  --role <role>       User role: "admin" or "reader" (default: "admin")
  --expires <dur>     Token lifetime: "90d", "30d", "7d", "1y", "none" (default: "90d")
  --generate-secret   Generate a new MCP_JWT_SECRET and exit
  --help              Show this help message
`);
  process.exit(0);
}

// ── Load secret ─────────────────────────────────────────────────────

function loadSecret() {
  // 1. Check environment
  if (process.env.MCP_JWT_SECRET) return process.env.MCP_JWT_SECRET;

  // 2. Try .env file at repo root
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const envPath = resolve(__dirname, "..", ".env");
  try {
    const envContent = readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const match = line.match(/^MCP_JWT_SECRET\s*=\s*"?([^"#\n]+)"?/);
      if (match) return match[1].trim();
    }
  } catch {
    // .env not found, that's fine
  }

  return null;
}

// ── Generate secret mode ────────────────────────────────────────────

if (args["generate-secret"]) {
  const secret = randomBytes(32).toString("hex");
  console.log(`\nGenerated MCP_JWT_SECRET:\n`);
  console.log(`  export MCP_JWT_SECRET="${secret}"`);
  console.log(`\nAdd this to your .env file and Kamal secrets.\n`);
  process.exit(0);
}

// ── Main: issue token ───────────────────────────────────────────────

const secret = loadSecret();
if (!secret) {
  console.error("Error: MCP_JWT_SECRET not found in environment or .env file.");
  console.error("Run with --generate-secret to create one:");
  console.error("  node scripts/issue-token.mjs --generate-secret\n");
  process.exit(1);
}

const user = args.user;
const role = args.role || "admin";
const expiresArg = args.expires || "90d";

if (!user) {
  console.error("Error: --user is required");
  process.exit(1);
}

// Parse expiration
function parseExpiry(str) {
  if (str === "none") return undefined;
  const match = str.match(/^(\d+)([dhmy])$/);
  if (!match) {
    console.error(
      `Invalid --expires value: "${str}". Use e.g. "90d", "1y", "none".`,
    );
    process.exit(1);
  }
  const num = parseInt(match[1], 10);
  const unit = match[2];
  const map = { d: "d", h: "h", m: "d", y: "y" };
  // jsonwebtoken uses: s, m(inutes), h, d, w, y
  if (unit === "m") return `${num * 30}d`; // months → days
  return `${num}${map[unit]}`;
}

const jti = randomBytes(4).toString("hex");
const payload = { sub: user, role, jti };
const options = {};
const expiresIn = parseExpiry(expiresArg);
if (expiresIn) options.expiresIn = expiresIn;

const token = jwt.sign(payload, secret, { algorithm: "HS256", ...options });
const decoded = jwt.decode(token);

// Format expiry date
let expiryStr = "never";
if (decoded.exp) {
  const date = new Date(decoded.exp * 1000);
  const days = Math.round((decoded.exp - decoded.iat) / 86400);
  expiryStr = `${date.toISOString().split("T")[0]} (${days} days)`;
}

console.log(`
╔══════════════════════════════════════════════════╗
║  JWT Token Issued                                ║
╠══════════════════════════════════════════════════╣
║  User:     ${user.padEnd(38)}║
║  Role:     ${role.padEnd(38)}║
║  Token ID: ${jti.padEnd(38)}║
║  Expires:  ${expiryStr.padEnd(38)}║
╚══════════════════════════════════════════════════╝

Token:
${token}

MCP Client Config (add to Claude Desktop, VS Code, etc.):
{
  "headers": {
    "Authorization": "Bearer ${token}"
  }
}
`);
