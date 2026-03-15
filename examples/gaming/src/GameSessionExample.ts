/**
 * SessionGuard — Gaming Integration Example
 *
 * This demonstrates how a blockchain game integrates SessionGuard
 * to give players seamless UX while maintaining self-custody.
 *
 * Use Case: An RPG game where players buy items, move characters,
 * and claim rewards — all without wallet popups.
 */

import {
  SessionGuardClient,
  AllowlistPolicy,
  SpendingLimitPolicy,
  RateLimitPolicy,
  GasLimitPolicy,
  type ActiveSession,
} from "@sessionguard/sdk";

// ── Contract Addresses (your deployed game contracts) ──────────
const GAME_ITEMS_CONTRACT = "0x1111111111111111111111111111111111111111" as const;
const GAME_WORLD_CONTRACT = "0x2222222222222222222222222222222222222222" as const;
const REWARDS_CONTRACT = "0x3333333333333333333333333333333333333333" as const;

// ── Function Selectors ─────────────────────────────────────────
const SELECTORS = {
  buyItem: "0xa0712d68" as `0x${string}`,       // buyItem(uint256)
  useItem: "0x7c025200" as `0x${string}`,       // useItem(uint256,uint256)
  moveCharacter: "0x12345678" as `0x${string}`,  // moveCharacter(int256,int256)
  claimReward: "0xabcdef01" as `0x${string}`,    // claimReward(uint256)
} as const;

// ── Initialize Client ──────────────────────────────────────────
const client = new SessionGuardClient({
  chainId: 137, // Polygon — low fees, fast blocks
  rpcUrl: "https://polygon-rpc.com",
  bundlerUrl: "https://bundler.sessionguard.io/polygon",
  paymasterUrl: "https://paymaster.sessionguard.io/polygon",
});

// ── Player Login Flow ──────────────────────────────────────────
export async function startGameSession(playerWallet: `0x${string}`): Promise<ActiveSession> {
  // 1. Get or deploy smart account
  const account = await client.createAccount({ owner: playerWallet });

  // 2. Create session with game-specific policies
  const session = await client.createSession({
    account,
    label: "Dragon Quest — Play Session",
    ttlSeconds: 8 * 60 * 60, // 8-hour gaming session
    policies: [
      // Only game contracts
      AllowlistPolicy({
        rules: [
          { target: GAME_ITEMS_CONTRACT, selector: SELECTORS.buyItem },
          { target: GAME_ITEMS_CONTRACT, selector: SELECTORS.useItem },
          { target: GAME_WORLD_CONTRACT, selector: SELECTORS.moveCharacter },
          { target: REWARDS_CONTRACT, selector: SELECTORS.claimReward },
        ],
      }),
      // Max 20 USDC per session on items
      SpendingLimitPolicy({ maxAmount: 20_000_000n }), // 20 USDC
      // Max 120 ops per minute (2 per second — handles fast gameplay)
      RateLimitPolicy({ maxOps: 120, windowSeconds: 60 }),
      // Cap total gas to prevent abuse
      GasLimitPolicy({ maxGas: 50_000_000n }),
    ],
  });

  console.log(`🎮 Game session started for ${playerWallet}`);
  console.log(`   Session key: ${session.sessionKey}`);
  console.log(`   Expires: ${new Date(session.expiresAt * 1000).toLocaleString()}`);

  return session;
}

// ── Gameplay Actions (no wallet popups!) ────────────────────────
export async function buyItem(session: ActiveSession, itemId: bigint) {
  // This executes instantly — session key signs automatically
  const receipt = await client.execute({
    session,
    target: GAME_ITEMS_CONTRACT,
    data: `${SELECTORS.buyItem}${itemId.toString(16).padStart(64, "0")}` as `0x${string}`,
  });

  console.log(`🛒 Bought item #${itemId} — tx: ${receipt.transactionHash}`);
  return receipt;
}

export async function moveCharacter(session: ActiveSession, x: number, y: number) {
  const xHex = BigInt(x).toString(16).padStart(64, "0");
  const yHex = BigInt(y).toString(16).padStart(64, "0");

  const receipt = await client.execute({
    session,
    target: GAME_WORLD_CONTRACT,
    data: `${SELECTORS.moveCharacter}${xHex}${yHex}` as `0x${string}`,
  });

  console.log(`🏃 Moved to (${x}, ${y}) — tx: ${receipt.transactionHash}`);
  return receipt;
}

export async function claimReward(session: ActiveSession, questId: bigint) {
  const receipt = await client.execute({
    session,
    target: REWARDS_CONTRACT,
    data: `${SELECTORS.claimReward}${questId.toString(16).padStart(64, "0")}` as `0x${string}`,
  });

  console.log(`🏆 Claimed quest #${questId} reward — tx: ${receipt.transactionHash}`);
  return receipt;
}

// ── End Session (player logs out or session expires) ────────────
export async function endGameSession(session: ActiveSession) {
  await client.revokeSession(session.account, session.sessionKey);
  console.log(`👋 Session ended for ${session.account}`);
}
