export type SolanaPolicyType =
  | "spending-limit"
  | "allowlist"
  | "time-bound"
  | "rate-limit"
  | "compute-limit";

export interface BaseSolanaPolicyConfig {
  type: SolanaPolicyType;
  /** On-chain policy PDA address (populated after configuration) */
  address?: string;
}

export interface SpendingLimitPolicyConfig extends BaseSolanaPolicyConfig {
  type: "spending-limit";
  /** Maximum amount in lamports (native SOL) or token smallest unit */
  maxAmount: bigint;
  /** Token mint address (null/undefined for native SOL) */
  tokenMint?: string;
}

export interface AllowlistPolicyConfig extends BaseSolanaPolicyConfig {
  type: "allowlist";
  /** Array of allowed program IDs */
  allowedPrograms: string[];
}

export interface TimeBoundPolicyConfig extends BaseSolanaPolicyConfig {
  type: "time-bound";
  /** Duration string (e.g., "24h", "7d", "30m") */
  duration: string;
}

export interface RateLimitPolicyConfig extends BaseSolanaPolicyConfig {
  type: "rate-limit";
  /** Max operations per window */
  maxOps: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

export interface ComputeLimitPolicyConfig extends BaseSolanaPolicyConfig {
  type: "compute-limit";
  /** Maximum total compute units for the session */
  maxComputeUnits: bigint;
}

export type SolanaPolicyConfig =
  | SpendingLimitPolicyConfig
  | AllowlistPolicyConfig
  | TimeBoundPolicyConfig
  | RateLimitPolicyConfig
  | ComputeLimitPolicyConfig;
