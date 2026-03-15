/**
 * SessionGuard — Social Platform Example
 *
 * Demonstrates instant micro-transactions for social apps:
 * tipping, boosting, collecting — all without wallet popups.
 */

import {
  SessionGuardClient,
  AllowlistPolicy,
  SpendingLimitPolicy,
  RateLimitPolicy,
  type ActiveSession,
} from "@sessionguard/sdk";

const TIPPING_CONTRACT = "0x9999999999999999999999999999999999999999" as const;
const BOOST_CONTRACT = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;
const COLLECTIBLE_CONTRACT = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as const;

const SELECTORS = {
  tipCreator: "0xcc000001" as `0x${string}`,
  boostPost: "0xcc000002" as `0x${string}`,
  mintCollectible: "0xcc000003" as `0x${string}`,
} as const;

const client = new SessionGuardClient({
  chainId: 8453, // Base
  rpcUrl: "https://mainnet.base.org",
  bundlerUrl: "https://bundler.sessionguard.io/base",
  paymasterUrl: "https://paymaster.sessionguard.io/base",
});

/**
 * Start a social browsing session
 * User pre-authorizes micro-transactions for seamless scrolling
 */
export async function startSocialSession(
  userAccount: `0x${string}`,
  dailyBudget: bigint = 10_000_000n // $10 USDC default
): Promise<ActiveSession> {
  const session = await client.createSession({
    account: userAccount,
    label: "Social — Daily Browse",
    ttlSeconds: 24 * 60 * 60,
    policies: [
      AllowlistPolicy({
        rules: [
          { target: TIPPING_CONTRACT, selector: SELECTORS.tipCreator },
          { target: BOOST_CONTRACT, selector: SELECTORS.boostPost },
          { target: COLLECTIBLE_CONTRACT, selector: SELECTORS.mintCollectible },
        ],
      }),
      SpendingLimitPolicy({ maxAmount: dailyBudget }),
      RateLimitPolicy({ maxOps: 200, windowSeconds: 3600 }),
    ],
  });

  console.log(`📱 Social session started — daily budget: ${dailyBudget} USDC`);
  return session;
}

/** Tip a content creator — instant, no popup */
export async function tipCreator(session: ActiveSession, creatorId: bigint, amount: bigint) {
  const receipt = await client.execute({
    session,
    target: TIPPING_CONTRACT,
    data: `${SELECTORS.tipCreator}${creatorId.toString(16).padStart(64, "0")}` as `0x${string}`,
  });
  console.log(`💰 Tipped creator #${creatorId} — ${amount} USDC`);
  return receipt;
}

/** Boost a post — instant, no popup */
export async function boostPost(session: ActiveSession, postId: bigint) {
  const receipt = await client.execute({
    session,
    target: BOOST_CONTRACT,
    data: `${SELECTORS.boostPost}${postId.toString(16).padStart(64, "0")}` as `0x${string}`,
  });
  console.log(`🚀 Boosted post #${postId}`);
  return receipt;
}

/** Mint a collectible — instant, no popup */
export async function mintCollectible(session: ActiveSession, collectibleId: bigint) {
  const receipt = await client.execute({
    session,
    target: COLLECTIBLE_CONTRACT,
    data: `${SELECTORS.mintCollectible}${collectibleId.toString(16).padStart(64, "0")}` as `0x${string}`,
  });
  console.log(`🎨 Minted collectible #${collectibleId}`);
  return receipt;
}
