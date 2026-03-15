import type {
  SpendingLimitPolicyConfig,
  AllowlistPolicyConfig,
  TimeBoundPolicyConfig,
  RateLimitPolicyConfig,
  GasLimitPolicyConfig,
} from "../types/policy";

/**
 * Create a Spending Limit policy config
 *
 * @example
 * SpendingLimitPolicy({ maxAmount: parseEther("5"), token: USDC_ADDRESS })
 */
export function SpendingLimitPolicy(params: {
  maxAmount: bigint;
  token?: `0x${string}`;
}): SpendingLimitPolicyConfig {
  return {
    type: "spending-limit",
    maxAmount: params.maxAmount,
    token: params.token,
  };
}

/**
 * Create an Allowlist policy config — restricts which contracts and functions can be called
 *
 * @example
 * AllowlistPolicy({
 *   rules: [
 *     { target: GAME_CONTRACT, selector: toFunctionSelector("buyItem(uint256)") },
 *     { target: NFT_CONTRACT, selector: toFunctionSelector("transfer(address,uint256)") },
 *   ]
 * })
 */
export function AllowlistPolicy(params: {
  rules: Array<{ target: `0x${string}`; selector: `0x${string}` }>;
}): AllowlistPolicyConfig {
  return {
    type: "allowlist",
    rules: params.rules,
  };
}

/**
 * Create a Time Bound policy config
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
 * Create a Rate Limit policy config
 *
 * @example
 * RateLimitPolicy({ maxOps: 10, windowSeconds: 60 }) // 10 ops per minute
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
 * Create a Gas Limit policy config
 *
 * @example
 * GasLimitPolicy({ maxGas: 5_000_000n })
 */
export function GasLimitPolicy(params: { maxGas: bigint }): GasLimitPolicyConfig {
  return {
    type: "gas-limit",
    maxGas: params.maxGas,
  };
}
