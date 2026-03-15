import express from "express";
import cors from "cors";
import helmet from "helmet";
import { sessionsRouter } from "./routes/sessions";
import { accountsRouter } from "./routes/accounts";
import { bundlerRouter } from "./routes/bundler";
import { solanaAccountsRouter } from "./routes/solana/accounts";
import { solanaSessionsRouter } from "./routes/solana/sessions";
import { solanaTransactionsRouter } from "./routes/solana/transactions";
import { apiKeyAuth } from "./middleware/auth";
import { createRateLimiter } from "./middleware/rateLimit";

const app = express();
const PORT = parseInt(process.env.SESSIONGUARD_API_PORT ?? "4000", 10);

// ─── Security Middleware ──────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(",") ?? "*" }));
app.use(express.json({ limit: "100kb" }));

// ─── Rate Limiting ────────────────────────────────────────────────
app.use(createRateLimiter());

// ─── Health Check ────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "sessionguard-api", version: "0.1.0" });
});

// ─── API Routes (require API key) ────────────────────────────────
app.use("/api/v1/accounts", apiKeyAuth, accountsRouter);
app.use("/api/v1/sessions", apiKeyAuth, sessionsRouter);
app.use("/api/v1/bundler", apiKeyAuth, bundlerRouter);

// ─── Solana API Routes ──────────────────────────────────────────
app.use("/api/v1/solana/accounts", apiKeyAuth, solanaAccountsRouter);
app.use("/api/v1/solana/sessions", apiKeyAuth, solanaSessionsRouter);
app.use("/api/v1/solana/transactions", apiKeyAuth, solanaTransactionsRouter);

// ─── Error Handler ───────────────────────────────────────────────
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("[SessionGuard API Error]", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
);

// ─── Start ───────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🛡️  SessionGuard API running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Docs:   http://localhost:${PORT}/api/v1`);
});

export default app;
