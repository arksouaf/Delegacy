/**
 * SessionGuard — DeFi Automation Example
 *
 * Demonstrates how a DeFi trading bot uses session keys
 * to execute trades with strict on-chain guardrails.
 */

import {
  SessionGuardClient,
  AllowlistPolicy,
  SpendingLimitPolicy,
  RateLimitPolicy,
  type ActiveSession,
} from "@sessionguard/sdk";

const UNISWAP_V3_ROUTER = "0xE592427A0AEce92De3Edee1F18E0157C05861564" as const;
const AAVE_POOL = "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2" as const;

const SELECTORS = {
  exactInputSingle: "0x414bf389" as `0x${string}`,
  supply: "0x617ba037" as `0x${string}`,
  withdraw: "0x69328dec" as `0x${string}`,
} as const;

const client = new SessionGuardClient({
  chainId: 1,
  rpcUrl: "https://eth-mainnet.g.alchemy.com/v2/demo",
  bundlerUrl: "https://bundler.sessionguard.io/mainnet",
});

/**
 * Create a trading bot session with strict limits
 */
export async function createTradingBotSession(
  userAccount: `0x${string}`
): Promise<ActiveSession> {
  const session = await client.createSession({
    account: userAccount,
    label: "DeFi Arb Bot — Conservative",
    ttlSeconds: 4 * 60 * 60, // 4 hours
    policies: [
      AllowlistPolicy({
        rules: [
          { target: UNISWAP_V3_ROUTER, selector: SELECTORS.exactInputSingle },
          { target: AAVE_POOL, selector: SELECTORS.supply },
          { target: AAVE_POOL, selector: SELECTORS.withdraw },
        ],
      }),
      SpendingLimitPolicy({ maxAmount: 500_000_000n }), // 500 USDC
      RateLimitPolicy({ maxOps: 20, windowSeconds: 3600 }), // 20 trades/hr
    ],
  });

  console.log(`📈 Trading bot session created`);
  console.log(`   Budget: 500 USDC | Max 20 trades/hr | Expires in 4h`);
  return session;
}

/**
 * Execute a swap on Uniswap (bot calls this automatically)
 */
export async function executeSwap(
  session: ActiveSession,
  tokenIn: `0x${string}`,
  tokenOut: `0x${string}`,
  amountIn: bigint
) {
  const receipt = await client.execute({
    session,
    target: UNISWAP_V3_ROUTER,
    data: `${SELECTORS.exactInputSingle}${"0".repeat(64)}` as `0x${string}`, // placeholder encoding
  });

  console.log(`🔄 Swap executed: ${amountIn} → tx: ${receipt.transactionHash}`);
  return receipt;
}
