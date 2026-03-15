import { Router, type Request, type Response } from "express";

export const bundlerRouter = Router();

/**
 * POST /api/v1/bundler/send
 * Relay a UserOperation to the bundler
 *
 * This endpoint acts as a proxy/relay to the bundler, adding:
 * - API key validation (done by middleware)
 * - Paymaster sponsorship (if enabled)
 * - Analytics tracking
 * - Rate limiting per API key
 */
bundlerRouter.post("/send", async (req: Request, res: Response) => {
  try {
    const { userOp, chainId } = req.body as {
      userOp: Record<string, string>;
      chainId: number;
    };

    if (!userOp || !chainId) {
      res.status(400).json({ error: "userOp and chainId are required" });
      return;
    }

    // TODO: Validate UserOp structure
    // TODO: Optionally sponsor with paymaster
    // TODO: Forward to bundler
    // TODO: Track analytics

    const userOpHash = `0x${"b".repeat(64)}`;

    res.json({
      userOpHash,
      status: "pending",
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to relay UserOperation" });
  }
});

/**
 * GET /api/v1/bundler/receipt/:hash
 * Get UserOperation receipt
 */
bundlerRouter.get("/receipt/:hash", async (req: Request, res: Response) => {
  try {
    const { hash } = req.params;

    // TODO: Query bundler for receipt
    res.json({
      userOpHash: hash,
      status: "pending",
      receipt: null,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to get receipt" });
  }
});

/**
 * POST /api/v1/bundler/estimate
 * Estimate gas for a UserOperation
 */
bundlerRouter.post("/estimate", async (req: Request, res: Response) => {
  try {
    const { userOp, chainId } = req.body as {
      userOp: Record<string, string>;
      chainId: number;
    };

    // TODO: Forward to bundler's eth_estimateUserOperationGas
    res.json({
      callGasLimit: "0x30000",
      verificationGasLimit: "0x30000",
      preVerificationGas: "0x10000",
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to estimate gas" });
  }
});
