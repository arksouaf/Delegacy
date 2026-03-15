export type PolicyType =
  | "spending-limit"
  | "allowlist"
  | "time-bound"
  | "rate-limit"
  | "gas-limit";

export interface BasePolicyConfig {
  type: PolicyType;
  /** On-chain policy contract address (populated after deployment) */
  address?: `0x${string}`;
}

export interface SpendingLimitPolicyConfig extends BasePolicyConfig {
  type: "spending-limit";
  /** Maximum amount in token's smallest unit (wei for ETH) */
  maxAmount: bigint;
  /** Token address (address(0) for native ETH) */
  token?: `0x${string}`;
}

export interface AllowlistPolicyConfig extends BasePolicyConfig {
  type: "allowlist";
  /** Array of allowed (contract, selector) pairs */
  rules: Array<{
    target: `0x${string}`;
    selector: `0x${string}`;
  }>;
}

export interface TimeBoundPolicyConfig extends BasePolicyConfig {
  type: "time-bound";
  /** Duration string (e.g., "24h", "7d", "30m") */
  duration: string;
}

export interface RateLimitPolicyConfig extends BasePolicyConfig {
  type: "rate-limit";
  /** Max operations per window */
  maxOps: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

export interface GasLimitPolicyConfig extends BasePolicyConfig {
  type: "gas-limit";
  /** Maximum total gas units */
  maxGas: bigint;
}

export type PolicyConfig =
  | SpendingLimitPolicyConfig
  | AllowlistPolicyConfig
  | TimeBoundPolicyConfig
  | RateLimitPolicyConfig
  | GasLimitPolicyConfig;
