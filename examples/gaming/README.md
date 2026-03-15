# SessionGuard for Game Developers

> Let your players play. No wallet popups. No gas confusion. True ownership.

## The Problem for Game Studios

Every blockchain game today faces the same fatal UX problem:

1. **Player wants to move a character** → wallet popup → "confirm transaction" → wait 15 seconds
2. **Player wants to buy an item** → wallet popup → "confirm" → "do you have ETH for gas?" → confusion
3. **Player rage-quits** → never comes back → you lose a customer

This is why 83% of users abandon Web3 games within the first session.

## How SessionGuard Fixes This

```
Player opens game → signs ONCE → plays for 24 hours seamlessly
```

### What Happens Under the Hood

1. **Player logs in** with their wallet (MetaMask, WalletConnect, passkey, etc.)
2. **SessionGuard creates a smart wallet** for them (invisible to the player)
3. **Player approves a session** → "This game can spend up to 10 USDC on items for 24 hours"
4. **One signature, one time** — master key goes back in their pocket
5. **Game runs freely** — buy items, trade NFTs, earn rewards — all instant, all on-chain

### Session Key Policies for Games

| Policy | Example |
|--------|---------|
| **Spending Limit** | Max 10 USDC per session |
| **Contract Allowlist** | Only your game contracts |
| **Function Allowlist** | Only `buyItem()`, `moveCharacter()`, `claimReward()` |
| **Rate Limit** | Max 100 transactions per minute |
| **Time Bound** | Expires after 24 hours |
| **Gas Limit** | Max 5M gas units per session |

## Integration Example

```typescript
import { SessionGuardClient, AllowlistPolicy, SpendingLimitPolicy, RateLimitPolicy } from '@sessionguard/sdk';

// ── Initialize SessionGuard ─────────────────────────────────
const sg = new SessionGuardClient({
  chainId: 137,  // Polygon
  rpcUrl: 'https://polygon-rpc.com',
  bundlerUrl: 'https://bundler.sessionguard.io/polygon',
  paymasterUrl: 'https://paymaster.sessionguard.io/polygon', // you sponsor gas!
});

// ── When player logs in ─────────────────────────────────────
async function onPlayerLogin(playerWallet: `0x${string}`) {
  // Deploy smart account (or get existing)
  const account = await sg.createAccount({ owner: playerWallet });

  // Create a gaming session - player signs ONCE
  const session = await sg.createSession({
    account,
    label: 'Dragon Quest Session',
    ttlSeconds: 24 * 60 * 60,  // 24 hours
    policies: [
      // Only allow calls to your game contracts
      AllowlistPolicy({
        rules: [
          { target: GAME_ITEMS_CONTRACT, selector: '0x1234abcd' },  // buyItem()
          { target: GAME_ITEMS_CONTRACT, selector: '0x5678efgh' },  // useItem()
          { target: GAME_WORLD_CONTRACT, selector: '0x9abc0123' },  // moveCharacter()
          { target: REWARDS_CONTRACT,    selector: '0xdef01234' },  // claimReward()
        ],
      }),
      // Cap spending at 10 USDC
      SpendingLimitPolicy({ maxAmount: 10_000_000n }),  // 10 USDC (6 decimals)
      // Prevent bot spam
      RateLimitPolicy({ maxOps: 60, windowSeconds: 60 }),  // 60 ops/min
    ],
  });

  return session;
}

// ── During gameplay — no more wallet popups! ─────────────────
async function buyItem(session: ActiveSession, itemId: bigint) {
  await sg.execute({
    session,
    target: GAME_ITEMS_CONTRACT,
    data: encodeFunctionData({
      abi: gameItemsAbi,
      functionName: 'buyItem',
      args: [itemId],
    }),
  });
  // Instant — no popup, no gas prompt
}

async function moveCharacter(session: ActiveSession, x: number, y: number) {
  await sg.execute({
    session,
    target: GAME_WORLD_CONTRACT,
    data: encodeFunctionData({
      abi: gameWorldAbi,
      functionName: 'moveCharacter',
      args: [x, y],
    }),
  });
}
```

## Revenue Model for Your Game

| Feature | Benefit |
|---------|---------|
| **Gas Sponsorship** | You pay gas → players have zero friction → retention +3x |
| **NFT In-Game Items** | True ownership — players can trade on OpenSea |
| **Play-to-Earn** | Rewards are real tokens, on-chain, verifiable |
| **Anti-Cheat** | All moves are on-chain — transparent and auditable |

## Supported Game Engines

- **Unity** — via C# wrapper + WebGL bridge
- **Unreal** — via REST API
- **Godot** — via GDScript HTTP client
- **Web/JS** — native SDK integration
- **Mobile** — React Native / Flutter via SDK

## Get Started

```bash
npm install @sessionguard/sdk
```

That's it. Three lines of code to remove wallet popups from your game forever.
