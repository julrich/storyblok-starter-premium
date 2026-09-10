/**
 * Authentication routes for the Design Tokens Editor.
 *
 * Provides token-paste login flow: user pastes a JWT issued by an admin,
 * the server verifies it and sets an httpOnly cookie for the browser session.
 */

import { Router, json } from "express";
import type { Request, Response } from "express";
import {
  verifyToken,
  extractBearerToken,
  isAuthEnabled,
  type AuthUser,
} from "@kickstartds/shared-auth";

export function createAuthRoutes(): Router {
  const router = Router();
  router.use(json());

  // POST /api/auth/login — Exchange JWT for a session cookie
  router.post("/api/auth/login", (req: Request, res: Response) => {
    const { token } = req.body;
    if (!token || typeof token !== "string") {
      res.status(400).json({ error: "Token required" });
      return;
    }

    const user = verifyToken(token);
    if (!user) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    // Set httpOnly cookie with same expiry as the JWT
    const maxAge = (user.exp - Math.floor(Date.now() / 1000)) * 1000;
    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: Math.max(0, maxAge),
    });

    res.json({ user: user.sub, role: user.role });
  });

  // POST /api/auth/logout — Clear session cookie
  router.post("/api/auth/logout", (_req: Request, res: Response) => {
    res.clearCookie("auth_token");
    res.json({ ok: true });
  });

  // GET /api/auth/me — Check current session
  router.get("/api/auth/me", (req: Request, res: Response) => {
    if (!isAuthEnabled()) {
      // Auth disabled — return anonymous identity
      res.json({ user: "anonymous", role: "admin" });
      return;
    }

    const token = (req as any).cookies?.auth_token || extractBearerToken(req);
    if (!token) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const user = verifyToken(token);
    if (!user) {
      res.clearCookie("auth_token");
      res.status(401).json({ error: "Token expired or revoked" });
      return;
    }

    res.json({ user: user.sub, role: user.role });
  });

  return router;
}

/**
 * Express middleware that requires authentication for protected routes.
 * Accepts either an httpOnly cookie or an Authorization Bearer header.
 * When MCP_JWT_SECRET is not set, auth is disabled (passes through).
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: () => void,
): void {
  if (!isAuthEnabled()) {
    next();
    return;
  }

  const token = (req as any).cookies?.auth_token || extractBearerToken(req);
  const user = token ? verifyToken(token) : null;

  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  (req as any).user = user;
  next();
}
