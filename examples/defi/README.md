# SessionGuard for DeFi — Automated Trading with Guardrails

> Let bots trade. Let humans set the limits. On-chain enforcement.

## The Problem

DeFi power users want automated trading. But today they must either:
- **Hand over their private key** to a trading bot (insane risk)
- **Manually approve every trade** (defeats the purpose of automation)

## SessionGuard Solution

Create a session key for your trading bot with strict policies:

```typescript
import {
  SessionGuardClient,
  SpendingLimitPolicy,
  AllowlistPolicy,
  RateLimitPolicy,
  TimeBoundPolicy,
} from '@sessionguard/sdk';

const client = new SessionGuardClient({
  chainId: 1,
  rpcUrl: 'https://eth-mainnet.alchemyapi.io/v2/YOUR_KEY',
  bundlerUrl: 'https://bundler.sessionguard.io/mainnet',
});

// User authorizes a DeFi bot session — signs ONCE
const botSession = await client.createSession({
  account: userSmartAccount,
  label: 'Uniswap Arbitrage Bot',
  ttlSeconds: 4 * 60 * 60,  // 4 hours max
  policies: [
    // Only Uniswap V3 Router
    AllowlistPolicy({
      rules: [
        { target: UNISWAP_ROUTER, selector: EXACT_INPUT_SINGLE },
        { target: UNISWAP_ROUTER, selector: EXACT_OUTPUT_SINGLE },
      ],
    }),
    // Max $500 USDC at risk
    SpendingLimitPolicy({ maxAmount: 500_000_000n }),
    // Max 20 trades per hour
    RateLimitPolicy({ maxOps: 20, windowSeconds: 3600 }),
  ],
});

// Bot trades freely within these rails — user sleeps peacefully
```

## Key Benefits for DeFi

| Feature | Without SessionGuard | With SessionGuard |
|---------|---------------------|-------------------|
| Bot access | Full private key | Scoped session key |
| Spending | Unlimited | Capped per session |
| Contracts | Any contract | Whitelisted only |
| Duration | Forever | Time-limited |
| Revocation | Change private key | One-click revoke |
