/**
 * SessionGuard Solana — Commerce / Subscription Example
 *
 * Demonstrates self-custodial recurring payments and one-click
 * checkout on Solana — leveraging sub-second finality for instant UX.
 */

import {
  SolanaSessionGuardClient,
  AllowlistPolicy,
  SpendingLimitPolicy,
  RateLimitPolicy,
  type SolanaActiveSession,
} from "@sessionguard/solana-sdk";
import { Keypair } from "@solana/web3.js";

// ── Program IDs ────────────────────────────────────────────────
const PAYMENT_PROGRAM = "PayPrg11111111111111111111111111111111111111";
const STORE_PROGRAM = "StorePrg1111111111111111111111111111111111111";

// USDC on Solana (SPL Token mint)
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

// ── Initialize Client ──────────────────────────────────────────
const client = new SolanaSessionGuardClient({
  cluster: "mainnet-beta",
  rpcUrl: "https://api.mainnet-beta.solana.com",
});

/**
 * Create a monthly subscription session on Solana.
 * User signs once → merchant can charge once per month via SPL token transfer.
 */
export async function createSubscription(
  userKeypair: Keypair,
  guardAccount: string,
  planName: string,
  monthlyAmountUSDC: bigint
): Promise<SolanaActiveSession> {
  const session = await client.createSession({
    owner: userKeypair,
    guardAccount,
    label: `Subscription: ${planName}`,
    ttlSeconds: 30 * 24 * 60 * 60, // 30 days
    policies: [
      AllowlistPolicy({
        allowedPrograms: [PAYMENT_PROGRAM],
      }),
      SpendingLimitPolicy({
        maxAmount: monthlyAmountUSDC,
        tokenMint: USDC_MINT,
      }),
      RateLimitPolicy({ maxOps: 1, windowSeconds: 30 * 24 * 60 * 60 }),
    ],
  });

  console.log(`💳 Solana subscription created: ${planName}`);
  console.log(`   Amount: ${monthlyAmountUSDC} USDC/month`);
  console.log(`   Renews: ${new Date(session.expiresAt * 1000).toLocaleDateString()}`);

  return session;
}

/**
 * Create a shopping session for instant checkouts
 */
export async function createShoppingSession(
  shopperKeypair: Keypair,
  guardAccount: string,
  maxBudget: bigint
): Promise<SolanaActiveSession> {
  const session = await client.createSession({
    owner: shopperKeypair,
    guardAccount,
    label: "Shopping Session",
    ttlSeconds: 2 * 60 * 60, // 2 hours
    policies: [
      AllowlistPolicy({
        allowedPrograms: [STORE_PROGRAM],
      }),
      SpendingLimitPolicy({
        maxAmount: maxBudget,
        tokenMint: USDC_MINT,
      }),
    ],
  });

  console.log(`🛍️ Solana shopping session — budget: ${maxBudget} USDC`);
  return session;
}

/**
 * One-click purchase (instant on Solana — no popup)
 */
export async function oneClickPurchase(
  session: SolanaActiveSession,
  productId: number,
  price: bigint
) {
  const data = Buffer.alloc(12);
  data.writeUInt32LE(productId, 0);
  data.writeBigUInt64LE(price, 4);

  const result = await client.execute({
    session,
    targetProgram: STORE_PROGRAM,
    instructionData: data,
  });

  console.log(`✅ Purchase complete — product #${productId}, sig: ${result.signature}`);
  return result;
}
