/**
 * SessionGuard Solana — DeFi Automation Example
 *
 * Demonstrates how a DeFi trading bot uses session keys on Solana
 * to execute trades with strict on-chain guardrails.
 *
 * Solana's speed makes it ideal for high-frequency DeFi bots —
 * session keys add safety rails without adding latency.
 */

import {
  SolanaSessionGuardClient,
  AllowlistPolicy,
  SpendingLimitPolicy,
  RateLimitPolicy,
  type SolanaActiveSession,
} from "@sessionguard/solana-sdk";
import { Keypair } from "@solana/web3.js";

// ── DEX & Lending Program IDs ──────────────────────────────────
const JUPITER_PROGRAM = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";
const RAYDIUM_AMM = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";
const MARINADE_FINANCE = "MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD";

// ── Initialize Client ──────────────────────────────────────────
const client = new SolanaSessionGuardClient({
  cluster: "mainnet-beta",
  rpcUrl: "https://api.mainnet-beta.solana.com",
});

/**
 * Create a trading bot session with strict limits
 */
export async function createTradingBotSession(
  userKeypair: Keypair,
  guardAccount: string
): Promise<SolanaActiveSession> {
  const session = await client.createSession({
    owner: userKeypair,
    guardAccount,
    label: "DeFi Arb Bot — Solana Conservative",
    ttlSeconds: 4 * 60 * 60, // 4 hours
    policies: [
      AllowlistPolicy({
        allowedPrograms: [JUPITER_PROGRAM, RAYDIUM_AMM, MARINADE_FINANCE],
      }),
      SpendingLimitPolicy({ maxAmount: 50_000_000_000n }), // 50 SOL
      RateLimitPolicy({ maxOps: 60, windowSeconds: 3600 }), // 60 trades/hr
    ],
  });

  console.log(`📈 Solana trading bot session created`);
  console.log(`   Budget: 50 SOL | Max 60 trades/hr | Expires in 4h`);
  return session;
}

/**
 * Execute a swap on Jupiter (bot calls this automatically)
 */
export async function executeSwap(
  session: SolanaActiveSession,
  inputMint: string,
  outputMint: string,
  amountIn: bigint
) {
  // In production, you'd use Jupiter SDK to build the swap instruction
  const data = Buffer.alloc(32);

  const result = await client.execute({
    session,
    targetProgram: JUPITER_PROGRAM,
    instructionData: data,
  });

  console.log(`🔄 Swap executed on Jupiter — sig: ${result.signature}`);
  return result;
}

/**
 * Stake SOL on Marinade
 */
export async function stakeOnMarinade(
  session: SolanaActiveSession,
  amount: bigint
) {
  const data = Buffer.alloc(16);

  const result = await client.execute({
    session,
    targetProgram: MARINADE_FINANCE,
    instructionData: data,
  });

  console.log(`🥩 Staked on Marinade — sig: ${result.signature}`);
  return result;
}
