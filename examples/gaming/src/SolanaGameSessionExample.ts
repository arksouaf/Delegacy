/**
 * SessionGuard Solana — Gaming Integration Example
 *
 * Demonstrates how a Solana-based game integrates SessionGuard
 * for seamless player UX without wallet popups.
 *
 * Use Case: An RPG game on Solana where players buy items,
 * move characters, and claim rewards — all with sub-second finality.
 */

import {
  SolanaSessionGuardClient,
  AllowlistPolicy,
  SpendingLimitPolicy,
  RateLimitPolicy,
  ComputeLimitPolicy,
  type SolanaActiveSession,
} from "@sessionguard/solana-sdk";
import { Keypair } from "@solana/web3.js";

// ── Program IDs (your deployed Solana programs) ────────────────
const GAME_ITEMS_PROGRAM = "GameItem11111111111111111111111111111111111";
const GAME_WORLD_PROGRAM = "GameWrld11111111111111111111111111111111111";
const REWARDS_PROGRAM = "Rewards111111111111111111111111111111111111";

// ── Initialize Client ──────────────────────────────────────────
const client = new SolanaSessionGuardClient({
  cluster: "mainnet-beta",
  rpcUrl: "https://api.mainnet-beta.solana.com",
});

// ── Player Login Flow ──────────────────────────────────────────
export async function startGameSession(
  playerKeypair: Keypair,
  guardAccount: string
): Promise<SolanaActiveSession> {
  const session = await client.createSession({
    owner: playerKeypair,
    guardAccount,
    label: "Dragon Quest Solana — Play Session",
    ttlSeconds: 8 * 60 * 60, // 8-hour gaming session
    policies: [
      // Only game programs
      AllowlistPolicy({
        allowedPrograms: [GAME_ITEMS_PROGRAM, GAME_WORLD_PROGRAM, REWARDS_PROGRAM],
      }),
      // Max 5 SOL per session on items
      SpendingLimitPolicy({ maxAmount: 5_000_000_000n }), // 5 SOL in lamports
      // Max 120 ops per minute (fast gameplay — Solana handles it)
      RateLimitPolicy({ maxOps: 120, windowSeconds: 60 }),
      // Cap total compute units
      ComputeLimitPolicy({ maxComputeUnits: 50_000_000n }),
    ],
  });

  console.log(`🎮 Game session started on Solana`);
  console.log(`   Session key: ${session.sessionKey}`);
  console.log(`   Expires: ${new Date(session.expiresAt * 1000).toLocaleString()}`);

  return session;
}

// ── Gameplay Actions (instant — no wallet popups!) ──────────────
export async function buyItem(session: SolanaActiveSession, itemId: number) {
  const data = Buffer.alloc(8);
  data.writeUInt32LE(itemId, 0);

  const result = await client.execute({
    session,
    targetProgram: GAME_ITEMS_PROGRAM,
    instructionData: data,
  });

  console.log(`🛒 Bought item #${itemId} — sig: ${result.signature}`);
  return result;
}

export async function moveCharacter(
  session: SolanaActiveSession,
  x: number,
  y: number
) {
  const data = Buffer.alloc(8);
  data.writeInt32LE(x, 0);
  data.writeInt32LE(y, 4);

  const result = await client.execute({
    session,
    targetProgram: GAME_WORLD_PROGRAM,
    instructionData: data,
  });

  console.log(`🏃 Moved to (${x}, ${y}) — sig: ${result.signature}`);
  return result;
}

export async function claimReward(session: SolanaActiveSession, questId: number) {
  const data = Buffer.alloc(4);
  data.writeUInt32LE(questId, 0);

  const result = await client.execute({
    session,
    targetProgram: REWARDS_PROGRAM,
    instructionData: data,
  });

  console.log(`🏆 Claimed quest #${questId} reward — sig: ${result.signature}`);
  return result;
}

// ── End Session ─────────────────────────────────────────────────
export async function endGameSession(
  playerKeypair: Keypair,
  session: SolanaActiveSession
) {
  await client.revokeSession(playerKeypair, session);
  console.log(`👋 Solana game session ended`);
}
