/**
 * SessionGuard Solana — Social Platform Example
 *
 * Instant micro-transactions for social apps on Solana:
 * tipping, boosting, collecting — all without wallet popups.
 *
 * Solana's low fees make micro-transactions economically viable
 * (< $0.001 per tx vs $0.10-$5.00 on Ethereum L1).
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
const TIPPING_PROGRAM = "TipPrg11111111111111111111111111111111111111";
const BOOST_PROGRAM = "BoostPrg1111111111111111111111111111111111111";
const COLLECTIBLE_PROGRAM = "CollPrg11111111111111111111111111111111111";

// ── Initialize Client ──────────────────────────────────────────
const client = new SolanaSessionGuardClient({
  cluster: "mainnet-beta",
  rpcUrl: "https://api.mainnet-beta.solana.com",
});

/**
 * Start a social browsing session on Solana.
 * User pre-authorizes micro-transactions for seamless scrolling.
 */
export async function startSocialSession(
  userKeypair: Keypair,
  guardAccount: string,
  dailyBudget: bigint = 1_000_000_000n // 1 SOL default
): Promise<SolanaActiveSession> {
  const session = await client.createSession({
    owner: userKeypair,
    guardAccount,
    label: "Social — Daily Browse (Solana)",
    ttlSeconds: 24 * 60 * 60, // 24h
    policies: [
      AllowlistPolicy({
        allowedPrograms: [TIPPING_PROGRAM, BOOST_PROGRAM, COLLECTIBLE_PROGRAM],
      }),
      SpendingLimitPolicy({ maxAmount: dailyBudget }),
      RateLimitPolicy({ maxOps: 200, windowSeconds: 3600 }), // 200 per hour
    ],
  });

  console.log(`📱 Solana social session started — daily budget: ${dailyBudget} lamports`);
  return session;
}

/** Tip a content creator — instant, no popup */
export async function tipCreator(
  session: SolanaActiveSession,
  creatorPubkey: string,
  amountLamports: bigint
) {
  const data = Buffer.alloc(8);
  data.writeBigUInt64LE(amountLamports, 0);

  const result = await client.execute({
    session,
    targetProgram: TIPPING_PROGRAM,
    instructionData: data,
    accounts: [
      { pubkey: creatorPubkey, isSigner: false, isWritable: true },
    ],
  });

  console.log(`💰 Tipped creator — ${amountLamports} lamports, sig: ${result.signature}`);
  return result;
}

/** Boost a post — instant, no popup */
export async function boostPost(session: SolanaActiveSession, postAccount: string) {
  const data = Buffer.alloc(1); // minimal instruction

  const result = await client.execute({
    session,
    targetProgram: BOOST_PROGRAM,
    instructionData: data,
    accounts: [
      { pubkey: postAccount, isSigner: false, isWritable: true },
    ],
  });

  console.log(`🚀 Boosted post — sig: ${result.signature}`);
  return result;
}

/** Mint a collectible — instant, no popup */
export async function mintCollectible(
  session: SolanaActiveSession,
  collectionMint: string
) {
  const data = Buffer.alloc(1);

  const result = await client.execute({
    session,
    targetProgram: COLLECTIBLE_PROGRAM,
    instructionData: data,
    accounts: [
      { pubkey: collectionMint, isSigner: false, isWritable: true },
    ],
  });

  console.log(`🎨 Minted collectible — sig: ${result.signature}`);
  return result;
}
