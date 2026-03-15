import { Router, type Request, type Response } from "express";

export const solanaAccountsRouter = Router();

/**
 * POST /api/v1/solana/accounts
 * Initialize a SessionGuard account on Solana
 */
solanaAccountsRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { ownerPublicKey, cluster } = req.body as {
      ownerPublicKey: string;
      cluster?: string;
    };

    if (!ownerPublicKey) {
      res.status(400).json({ error: "ownerPublicKey is required" });
      return;
    }

    const selectedCluster = cluster ?? "devnet";

    // TODO: Call SolanaSessionGuardClient.initializeAccount()
    const guardAccountPda = "placeholder_pda_address";

    res.status(201).json({
      guardAccount: guardAccountPda,
      owner: ownerPublicKey,
      cluster: selectedCluster,
      status: "initialized",
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to initialize Solana account" });
  }
});

/**
 * GET /api/v1/solana/accounts/:ownerPublicKey
 * Get account details for a Solana SessionGuard account
 */
solanaAccountsRouter.get("/:ownerPublicKey", async (req: Request, res: Response) => {
  try {
    const { ownerPublicKey } = req.params;

    // TODO: Derive PDA and fetch on-chain state
    res.json({
      owner: ownerPublicKey,
      guardAccount: "placeholder_pda_address",
      sessionCount: 0,
      balance: "0",
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to get Solana account" });
  }
});

/**
 * GET /api/v1/solana/accounts/:ownerPublicKey/derive
 * Compute the guard account PDA for an owner (off-chain derivation)
 */
solanaAccountsRouter.get("/:ownerPublicKey/derive", async (req: Request, res: Response) => {
  try {
    const { ownerPublicKey } = req.params;

    // TODO: Derive PDA using seeds ["session_guard", owner]
    res.json({
      owner: ownerPublicKey,
      guardAccount: "placeholder_pda_address",
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to derive PDA" });
  }
});
