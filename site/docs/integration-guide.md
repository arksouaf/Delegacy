# Integration Guide

## Quick Start — 5 Minutes to Session Keys

### 1. Install the SDK

```bash
npm install @sessionguard/sdk
# or
pnpm add @sessionguard/sdk
# or
yarn add @sessionguard/sdk
```

### 2. Get API Credentials

Sign up at [sessionguard.io](https://sessionguard.io) and get your API key:
- `sg_test_xxx` for testnets (Sepolia, Base Goerli)
- `sg_live_xxx` for production (Ethereum, Polygon, Base, Arbitrum, Optimism)

### 3. Initialize the Client

```typescript
import { SessionGuardClient } from '@sessionguard/sdk';

const client = new SessionGuardClient({
  chainId: 8453,  // Base
  rpcUrl: 'https://mainnet.base.org',
  bundlerUrl: 'https://bundler.sessionguard.io/base',
  paymasterUrl: 'https://paymaster.sessionguard.io/base', // optional: sponsor gas
});
```

### 4. Create a Smart Account for Your User

```typescript
// User connects their wallet (MetaMask, WalletConnect, etc.)
const userWallet = '0x...'; // from your wallet connection

// Deploy a smart account (idempotent — returns existing if already deployed)
const account = await client.createAccount({ owner: userWallet });
console.log('Smart Account:', account);
```

### 5. Create a Session Key

```typescript
import { AllowlistPolicy, SpendingLimitPolicy } from '@sessionguard/sdk';

// This is the ONE TIME the user's master key signs
const session = await client.createSession({
  account,
  label: 'My App Session',
  ttlSeconds: 24 * 60 * 60,  // 24 hours
  policies: [
    AllowlistPolicy({
      rules: [
        { target: YOUR_CONTRACT, selector: '0x12345678' },
      ],
    }),
    SpendingLimitPolicy({ maxAmount: 1_000_000n }),  // 1 USDC
  ],
});
```

### 6. Execute Transactions (No Wallet Popups!)

```typescript
// This uses the session key — user is never prompted
const receipt = await client.execute({
  session,
  target: YOUR_CONTRACT,
  data: '0x...',  // encoded function call
});

console.log('Tx:', receipt.transactionHash);
```

---

## Supported Chains

| Chain | Chain ID | Status |
|-------|----------|--------|
| Ethereum Mainnet | 1 | ✅ Production |
| Polygon | 137 | ✅ Production |
| Base | 8453 | ✅ Production |
| Arbitrum One | 42161 | ✅ Production |
| Optimism | 10 | ✅ Production |
| Sepolia (testnet) | 11155111 | ✅ Testing |
| Base Goerli (testnet) | 84531 | ✅ Testing |

## Policy Reference

### SpendingLimitPolicy

Caps the total value a session key can spend.

```typescript
SpendingLimitPolicy({
  maxAmount: 10_000_000n,   // in token's smallest unit (e.g., 10 USDC)
  token: USDC_ADDRESS,       // optional; omit for native ETH
})
```

### AllowlistPolicy

Restricts which contracts and functions the session key can call.

```typescript
AllowlistPolicy({
  rules: [
    { target: CONTRACT_A, selector: '0x12345678' },  // specific function
    { target: CONTRACT_B, selector: '0xabcdef01' },  // another function
  ],
})
```

### TimeBoundPolicy

Sets session duration (alternative to ttlSeconds).

```typescript
TimeBoundPolicy({ duration: '24h' })  // supports: 30s, 5m, 2h, 7d, 1w
```

### RateLimitPolicy

Limits operations per time window.

```typescript
RateLimitPolicy({
  maxOps: 100,           // max operations
  windowSeconds: 3600,   // per 1 hour
})
```

### GasLimitPolicy

Caps total gas consumption.

```typescript
GasLimitPolicy({ maxGas: 10_000_000n })  // 10M gas units total
```

## REST API

If you prefer REST over the SDK:

### Create Account
```http
POST /api/v1/accounts
Authorization: Bearer sg_live_xxx
Content-Type: application/json

{
  "ownerAddress": "0x...",
  "chainId": 8453
}
```

### Create Session
```http
POST /api/v1/sessions
Authorization: Bearer sg_live_xxx
Content-Type: application/json

{
  "account": "0x...",
  "chainId": 8453,
  "ttlSeconds": 86400,
  "label": "Game Session",
  "policies": [
    { "type": "spending-limit", "maxAmount": "1000000" },
    { "type": "allowlist", "rules": [{ "target": "0x...", "selector": "0x..." }] }
  ]
}
```

### Revoke Session
```http
DELETE /api/v1/sessions/:account/:sessionKey
Authorization: Bearer sg_live_xxx
```

### Relay UserOperation
```http
POST /api/v1/bundler/send
Authorization: Bearer sg_live_xxx
Content-Type: application/json

{
  "chainId": 8453,
  "userOp": { ... }
}
```

## Error Handling

```typescript
try {
  await client.execute({ session, target, data });
} catch (error) {
  if (error.message.includes('SessionKeyExpired')) {
    // Session expired — create a new one (user signs again)
    session = await client.createSession({ ... });
  } else if (error.message.includes('SpendingLimitExceeded')) {
    // Budget exhausted
    console.log('Session budget used up');
  } else if (error.message.includes('PolicyCheckFailed')) {
    // Tried to call a non-allowed function
    console.log('Action not allowed by session policy');
  }
}
```
