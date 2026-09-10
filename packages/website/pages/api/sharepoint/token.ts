import type { NextApiRequest, NextApiResponse } from "next";

/**
 * GET /api/sharepoint/token
 *
 * Server-side proxy that acquires a Microsoft Graph access token via
 * Microsoft Entra ID (formerly Azure AD) client credentials flow.
 * The caller must provide a valid Storyblok preview token to authenticate.
 *
 * Required env vars:
 *   AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET
 *
 * Optional env var:
 *   NEXT_STORYBLOK_API_TOKEN — if set, the `token` query param is validated against it.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // ── CORS (plugin runs inside Storyblok's iframe) ─────────────────
  const origin = req.headers.origin;
  if (
    origin &&
    (origin.endsWith(".storyblok.com") ||
      origin === "https://app.storyblok.com")
  ) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "x-storyblok-token");
  }

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ── Validate caller via Storyblok token ──────────────────────────

  const storyblokToken =
    (req.query.token as string | undefined) ??
    (req.headers["x-storyblok-token"] as string | undefined);

  const expectedToken = process.env.NEXT_STORYBLOK_API_TOKEN;
  if (expectedToken) {
    if (!storyblokToken || storyblokToken !== expectedToken) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  // ── Check Azure env vars ─────────────────────────────────────────

  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    return res.status(500).json({
      error:
        "Azure AD configuration missing. Set AZURE_TENANT_ID, AZURE_CLIENT_ID, and AZURE_CLIENT_SECRET.",
    });
  }

  // ── Acquire token via client credentials flow ────────────────────

  const tokenUrl = `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
  });

  try {
    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!tokenRes.ok) {
      const errorData = await tokenRes.text();
      console.error("Azure AD token error:", tokenRes.status, errorData);
      return res.status(502).json({
        error: "Failed to acquire Microsoft Graph token",
      });
    }

    const tokenData = await tokenRes.json();

    return res.status(200).json({
      accessToken: tokenData.access_token,
      expiresIn: tokenData.expires_in,
    });
  } catch (err) {
    console.error("Azure AD token request failed:", err);
    return res.status(502).json({
      error: "Failed to acquire Microsoft Graph token",
    });
  }
}
