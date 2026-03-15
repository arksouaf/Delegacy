# Use Cases — Where SessionGuard Fits

## Overview

SessionGuard is **horizontal infrastructure**. Every application that touches digital assets
is a potential customer. Below are the verticals we're targeting, ordered by market readiness.

---

## 1. Gaming (Highest Priority)

**Market Size:** $3.2B blockchain gaming market (2025), projected $65B by 2030

**Pain Point:** Every in-game action triggers a wallet popup. Players leave.

**SessionGuard Solution:**
- Player signs once at game launch → plays for hours seamlessly
- In-game purchases, NFT trades, character movements — all instant
- Studio sponsors gas → player never sees "insufficient ETH"

**Policies Used:**
| Policy | Configuration |
|--------|--------------|
| Allowlist | Game contracts + specific functions only |
| Spending Limit | $20/session on in-game purchases |
| Rate Limit | 120 ops/min (fast gameplay) |
| Time Bound | 8-hour play sessions |

**Target Customers:** Immutable, Sky Mavis (Axie), Treasure DAO, indie studios

---

## 2. DeFi — Automated Trading

**Market Size:** $50B+ TVL across DeFi protocols

**Pain Point:** Users can't run trading bots without exposing their private key.

**SessionGuard Solution:**
- User authorizes a bot with a strict spending limit and trading window
- Bot executes swaps, provides liquidity — within the user's guardrails
- If bot goes rogue → can't exceed the on-chain enforced policies

**Policies Used:**
| Policy | Configuration |
|--------|--------------|
| Allowlist | Only Uniswap/Aave/1inch routers |
| Spending Limit | $500 per 4-hour window |
| Rate Limit | 20 trades/hour |
| Time Bound | 4-hour automated window |

**Target Customers:** DeFi aggregators, yield optimizers, trading platforms

---

## 3. Commerce & Subscriptions

**Market Size:** $1.2T global subscription economy

**Pain Point:** No native crypto subscription model. No "save card" equivalent.

**SessionGuard Solution:**
- Users authorize recurring charges (like subscribing to Spotify)
- One-click checkout for e-commerce (like Apple Pay)
- Self-custodial — no payment processor middleman
- Instant global settlement

**Policies Used:**
| Policy | Configuration |
|--------|--------------|
| Allowlist | Merchant payment contract only |
| Spending Limit | $9.99/month or $200/session |
| Rate Limit | 1 charge/month (subscription) |
| Time Bound | Monthly renewal |

**Target Customers:** Crypto-native SaaS, NFT marketplaces, media platforms

---

## 4. Enterprise & Treasury

**Market Size:** $250B+ corporate crypto holdings

**Pain Point:** Shared keys = zero accountability. Multi-sig = too slow for daily ops.

**SessionGuard Solution:**
- CFO holds master key (hardware wallet)
- Employees get role-based session keys with spending limits
- Full on-chain audit trail per session key
- Emergency revocation in one click

**Policies Used:**
| Policy | Configuration |
|--------|--------------|
| Allowlist | Approved vendor/payroll contracts |
| Spending Limit | Per-role budgets ($200 intern → $500K finance) |
| Rate Limit | Department-appropriate |
| Time Bound | Per-shift or per-quarter |

**Target Customers:** DAOs, crypto-native companies, traditional finance moving on-chain

---

## 5. Social & Creator Economy

**Market Size:** $250B creator economy + growing Web3 social

**Pain Point:** Micro-transactions (tips, boosts, likes) need to be instant.

**SessionGuard Solution:**
- Browse/scroll session with $10 daily budget
- Every tip, boost, collect is instant — no popup
- Creators receive tips directly — no platform cut enforced by code

**Policies Used:**
| Policy | Configuration |
|--------|--------------|
| Allowlist | Tipping + boost + collect contracts |
| Spending Limit | $10/day micro-budget |
| Rate Limit | 200 actions/hour |
| Time Bound | 24-hour browsing session |

**Target Customers:** Farcaster ecosystem, Lens ecosystem, BasePaint, Friend.tech

---

## 6. IoT & Machine Economy

**Market Size:** $1.1T IoT market by 2028

**Pain Point:** Devices need autonomous on-chain transactions but can't hold full keys.

**SessionGuard Solution:**
- Each device gets a daily session key from a fleet manager
- Devices transact autonomously within strict budgets
- If a device is compromised → session key is scoped, not a master key

**Policies Used:**
| Policy | Configuration |
|--------|--------------|
| Allowlist | Toll/charging/telemetry contracts |
| Spending Limit | $50/day per vehicle |
| Rate Limit | 500 ops/day |
| Time Bound | 24-hour rotation |

**Target Customers:** Fleet operators, supply chain platforms, smart city infrastructure

---

## Revenue Model

| Tier | Price | Included |
|------|-------|----------|
| **Free** | $0/mo | 1,000 UserOps, 1 chain, community support |
| **Growth** | $99/mo | 50,000 UserOps, all chains, email support |
| **Scale** | $499/mo | 500,000 UserOps, all chains, priority support, custom policies |
| **Enterprise** | Custom | Unlimited, SLA, dedicated support, on-prem option |

Additional revenue:
- **Paymaster fees** — 1% of sponsored gas (developer pays, user's experience is free)
- **Premium policies** — Custom policy development for enterprise clients
- **Analytics dashboard** — Usage metrics, spending reports, session analytics
