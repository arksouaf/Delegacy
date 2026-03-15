// ─── SessionGuard Solana SDK ────────────────────────────────────
// Public API surface for Solana integration

// Client
export { SolanaSessionGuardClient } from "./client/SolanaSessionGuardClient";
export type { SolanaSessionGuardConfig } from "./client/SolanaSessionGuardClient";
export { SolanaSessionKeyManager } from "./client/SolanaSessionKeyManager";

// Policies
export {
  SpendingLimitPolicy,
  AllowlistPolicy,
  TimeBoundPolicy,
  RateLimitPolicy,
  ComputeLimitPolicy,
} from "./policies";

// Types
export type {
  SolanaSessionConfig,
  SolanaSessionKeyData,
  SolanaActiveSession,
  SolanaSerializedSession,
} from "./types/session";
export type { SolanaPolicyConfig, SolanaPolicyType } from "./types/policy";
export type { TransactionResult } from "./types/transaction";

// Utils
export { parseDuration, deriveGuardPda, deriveSessionPda } from "./utils/pda";
