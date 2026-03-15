import type { Request, Response, NextFunction } from "express";

/**
 * API Key authentication middleware
 *
 * Developers register for an API key via the SessionGuard dashboard.
 * The key is sent in the Authorization header: `Bearer sg_live_xxx`
 */
export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({
      error: "Missing API key",
      hint: "Include 'Authorization: Bearer sg_live_xxx' header",
    });
    return;
  }

  const apiKey = authHeader.slice(7);

  if (!isValidApiKey(apiKey)) {
    res.status(403).json({ error: "Invalid API key" });
    return;
  }

  // Attach tenant info to request for downstream use
  (req as Record<string, unknown>).tenantId = extractTenantId(apiKey);

  next();
}

function isValidApiKey(key: string): boolean {
  // Must start with sg_live_ or sg_test_ and be at least 32 chars
  if (!key.startsWith("sg_live_") && !key.startsWith("sg_test_")) return false;
  if (key.length < 32) return false;

  // TODO: Look up in database / cache
  return true;
}

function extractTenantId(key: string): string {
  // TODO: Look up tenant from API key
  return "tenant_placeholder";
}
