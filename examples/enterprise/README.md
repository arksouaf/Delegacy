# SessionGuard for Enterprise — Delegated Corporate Wallets

> CFO holds the keys. Employees get scoped access. Full audit trail.

## The Problem

Companies managing crypto treasuries face a dilemma:
- **Shared private keys** → zero accountability, one leak = everything gone
- **Multi-sig for every tx** → slow, impractical for daily operations
- **Custodial services** → counterparty risk (remember FTX?)

## SessionGuard Solution

The CFO/treasury team holds the master key. Employees receive session keys with:
- **Department-specific spending limits**
- **Approved vendor contracts only**
- **Time-limited access** (per shift, per project, per quarter)
- **Full on-chain audit trail** — every action is traceable

## Integration Example

```typescript
import {
  SessionGuardClient,
  AllowlistPolicy,
  SpendingLimitPolicy,
  TimeBoundPolicy,
} from '@sessionguard/sdk';

const client = new SessionGuardClient({
  chainId: 1,
  rpcUrl: process.env.RPC_URL,
  bundlerUrl: process.env.BUNDLER_URL,
});

// CFO creates the corporate smart account (once)
const treasury = await client.createAccount({ owner: CFO_HARDWARE_WALLET });

// ── Grant marketing team a monthly budget ───────────────────
const marketingSession = await client.createSession({
  account: treasury,
  label: 'Marketing — Q1 Budget',
  ttlSeconds: 90 * 24 * 60 * 60,  // Quarterly
  policies: [
    AllowlistPolicy({
      rules: [
        { target: AD_PLATFORM_CONTRACT, selector: PAY_CAMPAIGN },
        { target: INFLUENCER_PAY_CONTRACT, selector: SEND_PAYMENT },
      ],
    }),
    SpendingLimitPolicy({ maxAmount: 50_000_000_000n }),  // $50K USDC
  ],
});

// ── Grant dev team access to deploy contracts ───────────────
const devOpsSession = await client.createSession({
  account: treasury,
  label: 'DevOps — Infrastructure',
  ttlSeconds: 30 * 24 * 60 * 60,
  policies: [
    AllowlistPolicy({
      rules: [
        { target: FACTORY_CONTRACT, selector: DEPLOY },
        { target: GAS_STATION, selector: TOP_UP },
      ],
    }),
    SpendingLimitPolicy({ maxAmount: 5_000_000_000n }),  // $5K
  ],
});

// ── Grant intern view-only access (read + claim expenses) ───
const internSession = await client.createSession({
  account: treasury,
  label: 'Intern — Expense Claims',
  ttlSeconds: 8 * 60 * 60,  // One work day
  policies: [
    AllowlistPolicy({
      rules: [{ target: EXPENSE_CONTRACT, selector: CLAIM_EXPENSE }],
    }),
    SpendingLimitPolicy({ maxAmount: 100_000_000n }),  // $100 max
  ],
});
```

## Compliance & Audit

| Requirement | How SessionGuard Delivers |
|---|---|
| **Segregation of duties** | Different session keys per team/role |
| **Spending controls** | On-chain enforced limits |
| **Time-boxing** | Sessions auto-expire |
| **Audit trail** | Every tx is on-chain, linked to a session key |
| **Emergency revocation** | CFO can revoke any session instantly |
| **No shared secrets** | Each employee gets their own session key |
