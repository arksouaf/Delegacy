/**
 * SessionGuard — Commerce / Subscription Example
 *
 * Demonstrates self-custodial recurring payments and one-click checkout.
 */

import {
  SessionGuardClient,
  AllowlistPolicy,
  SpendingLimitPolicy,
  RateLimitPolicy,
  type ActiveSession,
} from "@sessionguard/sdk";

const PAYMENT_CONTRACT = "0x4444444444444444444444444444444444444444" as const;
const STORE_CONTRACT = "0x5555555555555555555555555555555555555555" as const;

const SELECTORS = {
  chargeMonthly: "0xaabbccdd" as `0x${string}`,
  purchase: "0x11223344" as `0x${string}`,
} as const;

const client = new SessionGuardClient({
  chainId: 8453, // Base — low fees, Coinbase ecosystem
  rpcUrl: "https://mainnet.base.org",
  bundlerUrl: "https://bundler.sessionguard.io/base",
  paymasterUrl: "https://paymaster.sessionguard.io/base",
});

/**
 * Create a monthly subscription session
 * User signs once → merchant can charge once per month
 */
export async function createSubscription(
  userAccount: `0x${string}`,
  planName: string,
  monthlyAmountUSDC: bigint
): Promise<ActiveSession> {
  const session = await client.createSession({
    account: userAccount,
    label: `Subscription: ${planName}`,
    ttlSeconds: 30 * 24 * 60 * 60, // 30 days
    policies: [
      AllowlistPolicy({
        rules: [{ target: PAYMENT_CONTRACT, selector: SELECTORS.chargeMonthly }],
      }),
      SpendingLimitPolicy({ maxAmount: monthlyAmountUSDC }),
      RateLimitPolicy({ maxOps: 1, windowSeconds: 30 * 24 * 60 * 60 }),
    ],
  });

  console.log(`💳 Subscription created: ${planName}`);
  console.log(`   Amount: ${monthlyAmountUSDC} USDC/month`);
  console.log(`   Renews: ${new Date(session.expiresAt * 1000).toLocaleDateString()}`);

  return session;
}

/**
 * Create a shopping session for one-click checkouts
 */
export async function createShoppingSession(
  shopperAccount: `0x${string}`,
  maxBudget: bigint
): Promise<ActiveSession> {
  const session = await client.createSession({
    account: shopperAccount,
    label: "Shopping Session",
    ttlSeconds: 2 * 60 * 60, // 2 hours
    policies: [
      AllowlistPolicy({
        rules: [{ target: STORE_CONTRACT, selector: SELECTORS.purchase }],
      }),
      SpendingLimitPolicy({ maxAmount: maxBudget }),
    ],
  });

  console.log(`🛍️ Shopping session started — budget: ${maxBudget} USDC`);
  return session;
}

/**
 * Process a one-click purchase (no wallet popup)
 */
export async function oneClickPurchase(
  session: ActiveSession,
  productId: bigint,
  price: bigint
) {
  const receipt = await client.execute({
    session,
    target: STORE_CONTRACT,
    data: `${SELECTORS.purchase}${productId.toString(16).padStart(64, "0")}` as `0x${string}`,
    value: 0n,
  });

  console.log(`✅ Purchase complete — product #${productId}, tx: ${receipt.transactionHash}`);
  return receipt;
}
