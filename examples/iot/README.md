# SessionGuard for IoT & Supply Chain

> Machines transact autonomously. Humans set the guardrails.

## The Problem

IoT devices and supply chain systems need to make autonomous on-chain transactions:
- Vehicle paying for tolls and charging
- Supply chain node recording provenance
- Sensor publishing verified data

Giving a device a full private key is a massive security liability.

## SessionGuard Solution

Each device gets a **session key** with strict, narrow policies:

```typescript
// Fleet manager assigns a session key to each vehicle
const vehicleSession = await client.createSession({
  account: fleetTreasury,
  label: `Vehicle #${vehicleId} — Daily Ops`,
  ttlSeconds: 24 * 60 * 60,
  policies: [
    AllowlistPolicy({
      rules: [
        { target: TOLL_CONTRACT, selector: PAY_TOLL },
        { target: CHARGING_CONTRACT, selector: PAY_CHARGE },
        { target: TELEMETRY_CONTRACT, selector: REPORT_DATA },
      ],
    }),
    SpendingLimitPolicy({ maxAmount: 50_000_000n }),   // $50/day max
    RateLimitPolicy({ maxOps: 500, windowSeconds: 86400 }),
  ],
});
// Vehicle's embedded wallet uses this session key autonomously
```

## Key Properties

| Feature | Value |
|---------|-------|
| Device compromise | Session key is scoped — can't drain treasury |
| Key rotation | New session key daily — automatic |
| Audit trail | Every device action is on-chain |
| Fleet control | Central revocation by fleet manager |
