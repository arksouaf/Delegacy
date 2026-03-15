# SessionGuard for Social Platforms — Micro-transactions & Tipping

> Like, tip, post, reward — all on-chain, all instant, all self-custodial.

## The Problem

Social crypto apps (Farcaster, Lens, etc.) need micro-transactions:
- Tipping a creator ($0.25)
- Boosting a post ($0.10)
- Purchasing a collectible ($2.00)

Each action requiring a wallet signature kills the scrolling experience.

## SessionGuard Solution

Users authorize a social session with micro-spend limits:

```typescript
const socialSession = await client.createSession({
  account: userAccount,
  label: 'Farcaster Session',
  ttlSeconds: 24 * 60 * 60,  // 24 hours
  policies: [
    AllowlistPolicy({
      rules: [
        { target: TIPPING_CONTRACT, selector: TIP_CREATOR },
        { target: BOOST_CONTRACT, selector: BOOST_POST },
        { target: COLLECTIBLE_CONTRACT, selector: MINT },
      ],
    }),
    SpendingLimitPolicy({ maxAmount: 10_000_000n }),  // $10 daily budget
    RateLimitPolicy({ maxOps: 200, windowSeconds: 3600 }),  // 200 actions/hr
  ],
});

// Scrolling through feed — every interaction is instant:
await client.execute({ session: socialSession, target: TIPPING_CONTRACT, data: tipCalldata });
```

## Why Social Apps Need This

| Without SessionGuard | With SessionGuard |
|---------------------|-------------------|
| Wallet popup per tip | Instant tips |
| Users avoid tipping | 5x more micro-transactions |
| Can't do real-time engagement | Live streaming + tips |
| Custodial workarounds | True self-custody |
