# SessionGuard for Commerce — Subscriptions & One-Click Checkout

> Crypto payments that feel like Apple Pay. Recurring subscriptions without custody.

## The Problem

Crypto payments today require manually confirming every single purchase.
There's no "subscribe" button. No "save card for later." No recurring billing.

## SessionGuard Solution

### Recurring Subscriptions

```typescript
// User subscribes to a service — signs ONCE per billing cycle
const subscription = await client.createSession({
  account: userAccount,
  label: 'Spotify Premium — Monthly',
  ttlSeconds: 30 * 24 * 60 * 60,  // 30 days
  policies: [
    // Only your payment contract
    AllowlistPolicy({
      rules: [{ target: PAYMENT_CONTRACT, selector: CHARGE_MONTHLY }],
    }),
    // Max 1 charge of $9.99
    SpendingLimitPolicy({ maxAmount: 9_990_000n }),  // $9.99 USDC
    // Only 1 charge per month
    RateLimitPolicy({ maxOps: 1, windowSeconds: 30 * 24 * 60 * 60 }),
  ],
});
```

### One-Click Checkout (E-Commerce)

```typescript
// Shopper pre-authorizes a store for small purchases
const shoppingSession = await client.createSession({
  account: shopperAccount,
  label: 'Amazon-style shopping spree',
  ttlSeconds: 2 * 60 * 60,  // 2 hour shopping window
  policies: [
    AllowlistPolicy({
      rules: [{ target: STORE_CONTRACT, selector: PURCHASE }],
    }),
    SpendingLimitPolicy({ maxAmount: 200_000_000n }),  // $200 max
  ],
});

// Every "Buy Now" click is instant — no wallet popup
await client.execute({ session: shoppingSession, target: STORE_CONTRACT, data: buyItemCalldata });
```

## Why Merchants Love This

| Feature | Impact |
|---------|--------|
| No payment processor | 0% middleman fees (just gas) |
| Global by default | Accept payments from any country |
| Instant settlement | Funds arrive in seconds, not days |
| Self-custodial | No chargebacks, no disputes |
| Recurring billing | Session keys enable proper subscriptions |
