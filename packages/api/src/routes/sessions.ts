import { Router, type Request, type Response } from "express";

export const sessionsRouter = Router();

/**
 * POST /api/v1/sessions
 * Create a new session key with policies
 *
 * Body:
 * {
 *   account: "0x...",
 *   chainId: 1,
 *   policies: [
 *     { type: "spending-limit", maxAmount: "1000000000000000000" },
 *     { type: "allowlist", rules: [{ target: "0x...", selector: "0x..." }] },
 *     { type: "time-bound", duration: "24h" },
 *     { type: "rate-limit", maxOps: 100, windowSeconds: 3600 }
 *   ],
 *   ttlSeconds: 86400,
 *   label: "Game Session"
 * }
 */
sessionsRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { account, chainId, policies, ttlSeconds, label } = req.body as {
      account: string;
      chainId: number;
      policies: Array<Record<string, unknown>>;
      ttlSeconds?: number;
      label?: string;
    };

    if (!account || !chainId || !policies) {
      res.status(400).json({ error: "account, chainId, and policies are required" });
      return;
    }

    const ttl = ttlSeconds ?? 86_400;
    const now = Math.floor(Date.now() / 1000);

    // TODO: Generate session key and register on-chain via SDK
    const sessionKey = `0x${"a".repeat(40)}`;

    res.status(201).json({
      sessionKey,
      account,
      chainId,
      validAfter: now,
      validUntil: now + ttl,
      policies,
      label: label ?? "Unnamed Session",
      status: "active",
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to create session" });
  }
});

/**
 * GET /api/v1/sessions/:account
 * List all active sessions for an account
 */
sessionsRouter.get("/:account", async (req: Request, res: Response) => {
  try {
    const { account } = req.params;
    const chainId = parseInt(req.query.chainId?.toString() ?? "1", 10);

    // TODO: Query validator contract for registered session keys
    res.json({
      account,
      chainId,
      sessions: [],
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to list sessions" });
  }
});

/**
 * DELETE /api/v1/sessions/:account/:sessionKey
 * Revoke a session key
 */
sessionsRouter.delete("/:account/:sessionKey", async (req: Request, res: Response) => {
  try {
    const { account, sessionKey } = req.params;

    // TODO: Call validator.revokeSessionKey via SDK
    res.json({
      account,
      sessionKey,
      status: "revoked",
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to revoke session" });
  }
});

/**
 * GET /api/v1/sessions/:account/:sessionKey/status
 * Get session status (remaining limits, expiry, etc.)
 */
sessionsRouter.get("/:account/:sessionKey/status", async (req: Request, res: Response) => {
  try {
    const { account, sessionKey } = req.params;

    // TODO: Query on-chain state for remaining limits
    res.json({
      account,
      sessionKey,
      active: true,
      remainingSpend: "0",
      remainingOps: 0,
      expiresAt: 0,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to get session status" });
  }
});
