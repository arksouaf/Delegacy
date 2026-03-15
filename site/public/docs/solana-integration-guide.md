# Solana Integration Guide

## Quick Start — 5 Minutes to Session Keys on Solana

### 1. Install the SDK

```bash
npm install @sessionguard/solana-sdk
# or
pnpm add @sessionguard/solana-sdk
# or
yarn add @sessionguard/solana-sdk
```

### 2. Get API Credentials

Sign up at [sessionguard.io](https://sessionguard.io) and get your API key:
- `sg_test_xxx` for devnet / testnet
- `sg_live_xxx` for mainnet-beta

### 3. Initialize the Client

```typescript
import { SolanaSessionGuardClient } from '@sessionguard/solana-sdk';

const client = new SolanaSessionGuardClient({
  cluster: 'mainnet-beta',
  rpcUrl: 'https://api.mainnet-beta.solana.com',
});
```

### 4. Create a Guard Account for Your User

```typescript
import { Keypair } from '@solana/web3.js';

// User connects their Solana wallet (Phantom, Solflare, etc.)
const userKeypair = Keypair.generate(); // or from wallet adapter

// Initialize a SessionGuard account (PDA — deterministic, idempotent)
const guardAccount = await client.initializeAccount(userKeypair);
console.log('Guard Account PDA:', guardAccount);
```

### 5. Create a Session Key

```typescript
import { AllowlistPolicy, SpendingLimitPolicy } from '@sessionguard/solana-sdk';

// This is the ONE TIME the user's owner key signs
const session = await client.createSession({
  owner: userKeypair,
  guardAccount,
  label: 'My Solana App Session',
  ttlSeconds: 24 * 60 * 60,  // 24 hours
  policies: [
    AllowlistPolicy({
      allowedPrograms: ['YourProgram111111111111111111111111111111111'],
    }),
    SpendingLimitPolicy({ maxAmount: 1_000_000_000n }),  // 1 SOL
  ],
});
```

### 6. Execute Transactions (No Wallet Popups!)

```typescript
// This uses the session key — user is never prompted
const result = await client.execute({
  session,
  targetProgram: 'YourProgram111111111111111111111111111111111',
  instructionData: Buffer.from([/* encoded instruction */]),
});

console.log('Signature:', result.signature);
```

---

## Supported Clusters

| Cluster | Status |
|---------|--------|
| Mainnet-Beta | ✅ Production |
| Devnet | ✅ Testing |
| Testnet | ✅ Testing |
| Localnet | ✅ Development |

## Policy Reference

### SpendingLimitPolicy

Caps the total lamports (or SPL token amount) a session key can spend.

```typescript
SpendingLimitPolicy({
  maxAmount: 10_000_000_000n,   // 10 SOL in lamports
})

// With SPL token restriction:
SpendingLimitPolicy({
  maxAmount: 1_000_000n,        // 1 USDC (6 decimals)
  tokenMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
})
```

### AllowlistPolicy

Restricts which programs the session key can call via CPI.

```typescript
AllowlistPolicy({
  allowedPrograms: [
    'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',   // Jupiter
    'RVKd61ztZW9GUwhRbbLoYVRE5Xf1B2tVscKqwZqXgEr',   // Raydium
  ],
})
```

**Note:** Unlike EVM's `(target, selector)` pairs, Solana uses program IDs only — function routing is handled internally by each program's instruction discriminator.

### TimeBoundPolicy

Sets session duration (alternative to `ttlSeconds`).

```typescript
// Configured via ttlSeconds in createSession:
createSession({ ttlSeconds: 24 * 60 * 60 }) // 24 hours
```

### RateLimitPolicy

Limits operations per time window.

```typescript
RateLimitPolicy({
  maxOps: 100,           // max operations
  windowSeconds: 3600,   // per 1 hour
})
```

### ComputeLimitPolicy

Caps total compute units consumed (Solana's equivalent of gas).

```typescript
ComputeLimitPolicy({
  maxComputeUnits: 50_000_000n,  // 50M CUs total budget
})
```

**Note:** This replaces EVM's `GasLimitPolicy`. Solana's base compute unit budget per instruction is 200K, with a per-transaction cap of 1.4M.

## REST API

If you prefer REST over the SDK:

### Create Guard Account
```http
POST /api/v1/solana/accounts
Authorization: Bearer sg_live_xxx
Content-Type: application/json

{
  "ownerPublicKey": "7xKXtg...",
  "cluster": "mainnet-beta"
}
```

### Derive Guard Account PDA
```http
GET /api/v1/solana/accounts/:ownerPublicKey/derive
Authorization: Bearer sg_live_xxx
```

### Create Session
```http
POST /api/v1/solana/sessions
Authorization: Bearer sg_live_xxx
Content-Type: application/json

{
  "guardAccount": "3yZe...",
  "cluster": "mainnet-beta",
  "ttlSeconds": 86400,
  "label": "Game Session",
  "policies": [
    { "type": "spending-limit", "maxAmount": "1000000000" },
    { "type": "allowlist", "allowedPrograms": ["YourProgram1111..."] }
  ]
}
```

### Revoke Session
```http
DELETE /api/v1/solana/sessions/:guardAccount/:sessionKey
Authorization: Bearer sg_live_xxx
```

### Send Transaction
```http
POST /api/v1/solana/transactions/send
Authorization: Bearer sg_live_xxx
Content-Type: application/json

{
  "cluster": "mainnet-beta",
  "transaction": "base64-encoded-transaction"
}
```

### Check Transaction Status
```http
GET /api/v1/solana/transactions/:signature
Authorization: Bearer sg_live_xxx
```

### Simulate Transaction
```http
POST /api/v1/solana/transactions/simulate
Authorization: Bearer sg_live_xxx
Content-Type: application/json

{
  "cluster": "mainnet-beta",
  "transaction": "base64-encoded-transaction"
}
```

## Error Handling

```typescript
try {
  await client.execute({ session, targetProgram, instructionData });
} catch (error) {
  if (error.message.includes('SessionExpired')) {
    // Session expired — create a new one (user signs again)
    session = await client.createSession({ ... });
  } else if (error.message.includes('SpendingLimitExceeded')) {
    // Budget exhausted
    console.log('Session budget used up');
  } else if (error.message.includes('ProgramNotAllowed')) {
    // Tried to call a non-allowed program
    console.log('Program not in session allowlist');
  } else if (error.message.includes('RateLimitExceeded')) {
    // Too many operations in the time window
    console.log('Rate limit reached — wait for window reset');
  } else if (error.message.includes('ComputeLimitExceeded')) {
    // Compute budget exhausted
    console.log('Compute unit budget used up');
  }
}
```

## EVM → Solana Migration Cheatsheet

| EVM Concept | Solana Equivalent |
|-------------|------------------|
| `SessionGuardClient` | `SolanaSessionGuardClient` |
| `createAccount({ owner })` | `initializeAccount(ownerKeypair)` |
| `0x...` addresses | Base58 public keys |
| `chainId: 8453` | `cluster: 'mainnet-beta'` |
| `GasLimitPolicy` | `ComputeLimitPolicy` |
| `AllowlistPolicy({ rules: [{target, selector}] })` | `AllowlistPolicy({ allowedPrograms: [programId] })` |
| `data: '0x...'` (ABI-encoded) | `instructionData: Buffer` (Borsh/raw) |
| UserOperations + Bundler | Native Solana transactions |
| Paymaster (gas sponsorship) | Fee payer (any account can pay) |
| `receipt.transactionHash` | `result.signature` |
| Smart contract deployment | PDA derivation (no deployment needed) |
