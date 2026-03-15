import { Router, type Request, type Response } from "express";

export const accountsRouter = Router();

/**
 * POST /api/v1/accounts
 * Deploy a new SessionGuard smart account
 */
accountsRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { ownerAddress, salt, chainId } = req.body as {
      ownerAddress: string;
      salt?: string;
      chainId: number;
    };

    if (!ownerAddress || !chainId) {
      res.status(400).json({ error: "ownerAddress and chainId are required" });
      return;
    }

    // TODO: Call SessionGuardClient.createAccount()
    const accountAddress = `0x${"0".repeat(40)}`; // Placeholder

    res.status(201).json({
      account: accountAddress,
      owner: ownerAddress,
      chainId,
      status: "deployed",
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to create account" });
  }
});

/**
 * GET /api/v1/accounts/:address
 * Get account details
 */
accountsRouter.get("/:address", async (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    // TODO: Query on-chain state
    res.json({
      account: address,
      owner: `0x${"0".repeat(40)}`,
      validators: [],
      balance: "0",
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to get account" });
  }
});

/**
 * GET /api/v1/accounts/:address/counterfactual
 * Compute address before deployment
 */
accountsRouter.get("/:owner/counterfactual", async (req: Request, res: Response) => {
  try {
    const { owner } = req.params;
    const salt = req.query.salt?.toString() ?? "0";

    // TODO: Call factory.getAccountAddress()
    res.json({
      owner,
      salt,
      predictedAddress: `0x${"0".repeat(40)}`,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to compute address" });
  }
});
