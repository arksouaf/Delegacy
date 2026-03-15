import type {
  SpendingLimitPolicyConfig,
  AllowlistPolicyConfig,
  TimeBoundPolicyConfig,
  RateLimitPolicyConfig,
  ComputeLimitPolicyConfig,
} from "../types/policy";

/**
 * Create a Spending Limit policy config for Solana.
 *
 * @example
 * SpendingLimitPolicy({ maxAmount: 1_000_000_000n })  // 1 SOL
 * SpendingLimitPolicy({ maxAmount: 1_000_000n, tokenMint: USDC_MINT })
 */
export function SpendingLimitPolicy(params: {
  maxAmount: bigint;
  tokenMint?: string;
}): SpendingLimitPolicyConfig {
  return {
    type: "spending-limit",
    maxAmount: params.maxAmount,
    tokenMint: params.tokenMint,
  };
}

/**
 * Create an Allowlist policy config — restricts which programs the session can invoke.
 *
 * @example
 * AllowlistPolicy({
 *   allowedPrograms: [GAME_PROGRAM_ID, NFT_PROGRAM_ID],
 * })
 */
export function AllowlistPolicy(params: {
  allowedPrograms: string[];
}): AllowlistPolicyConfig {
  return {
    type: "allowlist",
    allowedPrograms: params.allowedPrograms,
  };
}

/**
 * Create a Time Bound policy config.
 *
 * @example
 * TimeBoundPolicy({ duration: "24h" })
 * TimeBoundPolicy({ duration: "7d" })
 */
export function TimeBoundPolicy(params: { duration: string }): TimeBoundPolicyConfig {
  return {
    type: "time-bound",
    duration: params.duration,
  };
}

/**
 * Create a Rate Limit policy config.
 *
 * @example
 * RateLimitPolicy({ maxOps: 10, windowSeconds: 60 })  // 10 ops per minute
 */
export function RateLimitPolicy(params: {
  maxOps: number;
  windowSeconds: number;
}): RateLimitPolicyConfig {
  return {
    type: "rate-limit",
    maxOps: params.maxOps,
    windowSeconds: params.windowSeconds,
  };
}

/**
 * Create a Compute Limit policy config (Solana equivalent of gas limit).
 *
 * @example
 * ComputeLimitPolicy({ maxComputeUnits: 50_000_000n })
 */
export function ComputeLimitPolicy(params: {
  maxComputeUnits: bigint;
}): ComputeLimitPolicyConfig {
  return {
    type: "compute-limit",
    maxComputeUnits: params.maxComputeUnits,
  };
}
