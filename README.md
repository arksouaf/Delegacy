# Delegacy

> **Session Key Wallet Infrastructure — as a Service**
>
> Give your users Web2-smooth UX with Web3-grade self-custody.
> Powered by ERC-4337 Account Abstraction + scoped session keys.

---

## What is Delegacy?

Delegacy is a B2B infrastructure platform that lets developers integrate **self-custodial smart wallets with session keys** into any application — games, DeFi, commerce, enterprise, and more.

Your users sign once to create a scoped, time-limited session key. From that point on, your app runs frictionlessly — no wallet popups, no gas confusion — while the user's master key stays safely in their control.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Delegacy Platform                     │
├──────────────┬──────────────┬────────────────────────────────┤
│  Contracts   │   SDK        │   API Service                  │
│  (Solidity)  │  (TypeScript)│   (REST + WebSocket)           │
├──────────────┼──────────────┼────────────────────────────────┤
│ SmartAccount │ Client       │ Session Management             │
│ Factory      │ SessionKeys  │ Account Deployment             │
│ Validator    │ Policies     │ Bundler Relay                  │
│ Policies     │ Signing      │ Paymaster Integration          │
│ Libraries    │ Encoding     │ Analytics Dashboard            │
└──────────────┴──────────────┴────────────────────────────────┘
```

## Packages

| Package | Path | Description |
|---------|------|-------------|
| `@delegacy/contracts` | `packages/contracts` | Solidity smart contracts (ERC-4337 account, validators, policies) |
| `@delegacy/sdk` | `packages/sdk` | TypeScript SDK for developers to integrate session keys |
| `@delegacy/api` | `packages/api` | Backend API service (session mgmt, bundler relay, paymaster) |

## Use Cases

- **Gaming** — Seamless in-game transactions without wallet popups
- **DeFi** — Automated trading bots with strict spending limits
- **Commerce** — One-click checkouts and recurring subscriptions
- **Enterprise** — Delegated corporate wallets with audit trails
- **Social** — Micro-transactions, tipping, and on-chain interactions

## Quick Start

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Deploy contracts (local)
pnpm --filter @delegacy/contracts deploy:local
```

## SDK Usage (30-second example)

```typescript
import { DelegacyClient, SpendingLimitPolicy } from '@delegacy/sdk';

// 1. Initialize client
const client = new DelegacyClient({
  chainId: 1,
  bundlerUrl: 'https://bundler.delegacy.io',
  paymasterUrl: 'https://paymaster.delegacy.io',
});

// 2. Create or connect a smart account
const account = await client.createAccount({ owner: masterSigner });

// 3. Create a session key with policies
const session = await client.createSession({
  account,
  policies: [
    SpendingLimitPolicy({ maxAmount: '5.0', token: 'USDC' }),
    TimeBoundPolicy({ duration: '24h' }),
    AllowlistPolicy({ contracts: [GAME_CONTRACT] }),
  ],
});

// 4. Use the session key — no more wallet popups
await session.execute({
  target: GAME_CONTRACT,
  data: encodeFunctionData({ abi: gameAbi, functionName: 'buyItem', args: [itemId] }),
});
```

## Development

```bash
# Prerequisites
node >= 18
pnpm >= 8
foundry (for Solidity)

# Setup
git clone <repo>
cd Delegacy
pnpm install

# Contracts
cd packages/contracts
forge build
forge test

# SDK
cd packages/sdk
pnpm build
pnpm test

# API
cd packages/api
pnpm dev
```

## License

MIT
