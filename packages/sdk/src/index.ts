// ─── SessionGuard SDK ──────────────────────────────────────
// Public API surface

// Client
export { SessionGuardClient } from "./client/SessionGuardClient";
export type { SessionGuardClientConfig } from "./client/SessionGuardClient";
export { SessionKeyManager } from "./client/SessionKeyManager";
export { BundlerClient } from "./client/BundlerClient";

// Policies
export {
  SpendingLimitPolicy,
  AllowlistPolicy,
  TimeBoundPolicy,
  RateLimitPolicy,
  GasLimitPolicy,
} from "./policies";

// Types
export type {
  SessionConfig,
  SessionKeyData,
  ActiveSession,
  SerializedSession,
} from "./types/session";
export type { PolicyConfig, PolicyType } from "./types/policy";
export type { UserOperation } from "./types/userOperation";
