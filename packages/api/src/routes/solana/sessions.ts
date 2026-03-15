import { Router, type Request, type Response } from "express";

export const solanaSessionsRouter = Router();

/**
 * POST /api/v1/solana/sessions
 * Create a new session key with policies on Solana
 *
 * Body:
 * {
 *   ownerPublicKey: "...",
 *   guardAccount: "...",
 *   cluster: "devnet",
 *   policies: [
 *     { type: "spending-limit", maxAmount: "1000000000" },
 *     { type: "allowlist", allowedPrograms: ["programId1", "programId2"] },
 *     { type: "rate-limit", maxOps: 100, windowSeconds: 3600 },
 *     { type: "compute-limit", maxComputeUnits: "50000000" }
 *   ],
 *   ttlSeconds: 86400,
 *   label: "Game Session"
 * }
 */
solanaSessionsRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { ownerPublicKey, guardAccount, cluster, policies, ttlSeconds, label } =
      req.body as {
        ownerPublicKey: string;
        guardAccount: string;
        cluster?: string;
        policies: Array<Record<string, unknown>>;
        ttlSeconds?: number;
        label?: string;
      };

    if (!ownerPublicKey || !guardAccount || !policies) {
      res
        .status(400)
        .json({ error: "ownerPublicKey, guardAccount, and policies are required" });
      return;
    }

    const ttl = ttlSeconds ?? 86_400;
    const now = Math.floor(Date.now() / 1000);

    // TODO: Generate session keypair and register on-chain via Solana SDK
    const sessionPublicKey = "placeholder_session_pubkey";
    const sessionKeyDataPda = "placeholder_session_data_pda";

    res.status(201).json({
      sessionKey: sessionPublicKey,
      sessionKeyDataPda,
      guardAccount,
      owner: ownerPublicKey,
      cluster: cluster ?? "devnet",
      validAfter: now,
      validUntil: now + ttl,
      policies,
      label: label ?? "Unnamed Session",
      status: "active",
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to create Solana session" });
  }
});

/**
 * GET /api/v1/solana/sessions/:guardAccount
 * List all active sessions for a Solana SessionGuard account
 */
solanaSessionsRouter.get("/:guardAccount", async (req: Request, res: Response) => {
  try {
    const { guardAccount } = req.params;

    // TODO: Query session key data PDAs from on-chain
    res.json({
      guardAccount,
      sessions: [],
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to list Solana sessions" });
  }
});

/**
 * DELETE /api/v1/solana/sessions/:guardAccount/:sessionKey
 * Revoke a session key on Solana
 */
solanaSessionsRouter.delete(
  "/:guardAccount/:sessionKey",
  async (req: Request, res: Response) => {
    try {
      const { guardAccount, sessionKey } = req.params;

      // TODO: Call revoke_session_key via Solana SDK
      res.json({
        guardAccount,
        sessionKey,
        status: "revoked",
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to revoke Solana session" });
    }
  }
);

/**
 * GET /api/v1/solana/sessions/:guardAccount/:sessionKey/status
 * Get session status (remaining limits, expiry, etc.)
 */
solanaSessionsRouter.get(
  "/:guardAccount/:sessionKey/status",
  async (req: Request, res: Response) => {
    try {
      const { guardAccount, sessionKey } = req.params;

      // TODO: Fetch session data + policy accounts from chain
      res.json({
        guardAccount,
        sessionKey,
        status: "active",
        policies: [],
        expiresAt: 0,
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to get session status" });
    }
  }
);
