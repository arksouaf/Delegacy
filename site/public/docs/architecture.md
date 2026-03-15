# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Developer's Application                         │
│                  (Game, DeFi App, Commerce Platform)                    │
└────────────────────┬──────────────────────────────────┬─────────────────┘
                     │  SDK (@sessionguard/sdk)          │  REST API
                     ▼                                   ▼
┌────────────────────────────────────┐  ┌──────────────────────────────┐
│       SessionGuardClient           │  │    SessionGuard API          │
│  ┌─────────────┐ ┌──────────────┐  │  │  ┌────────────────────────┐  │
│  │ SessionKey   │ │ BundlerClient│  │  │  │ /api/v1/accounts      │  │
│  │ Manager      │ │              │  │  │  │ /api/v1/sessions      │  │
│  └──────┬───────┘ └──────┬───────┘  │  │  │ /api/v1/bundler       │  │
│         │                │          │  │  └────────────────────────┘  │
│  ┌──────┴────────────────┴───────┐  │  │  Auth + Rate Limiting       │
│  │ Policy Builders               │  │  └──────────────┬───────────────┘
│  │ (Spending, Allowlist, Rate...)│  │                  │
│  └───────────────────────────────┘  │                  │
└────────────────────┬────────────────┘                  │
                     │                                   │
                     ▼                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        ERC-4337 Bundler                                 │
│                  (Collects UserOps, submits to chain)                   │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Blockchain (Ethereum / L2)                      │
│                                                                         │
│  ┌──────────────────┐  ┌────────────────────────────────────────────┐   │
│  │  EntryPoint       │  │  SessionGuard Contracts                    │   │
│  │  (ERC-4337        │  │  ┌────────────────┐  ┌─────────────────┐  │   │
│  │   Singleton)      │  │  │ SessionGuard   │  │ SessionKey      │  │   │
│  │                   │  │  │ Account        │  │ Validator       │  │   │
│  │  Validates &      │  │  │ (per user)     │  │ (module)        │  │   │
│  │  executes         │  │  └────────────────┘  └────────┬────────┘  │   │
│  │  UserOps          │  │                               │           │   │
│  │                   │  │  ┌────────────────────────────┴───────┐   │   │
│  │                   │  │  │ Policies                            │   │   │
│  │                   │  │  │ ┌──────────┐ ┌──────────┐          │   │   │
│  │                   │  │  │ │Spending  │ │Allowlist │          │   │   │
│  │                   │  │  │ │Limit     │ │Policy    │          │   │   │
│  │                   │  │  │ └──────────┘ └──────────┘          │   │   │
│  │                   │  │  │ ┌──────────┐ ┌──────────┐          │   │   │
│  │                   │  │  │ │Rate      │ │Gas       │          │   │   │
│  │                   │  │  │ │Limit     │ │Limit     │          │   │   │
│  │                   │  │  │ └──────────┘ └──────────┘          │   │   │
│  │                   │  │  └────────────────────────────────────┘   │   │
│  └───────────────────┘  └──────────────────────────────────────────┘   │
│                                                                         │
│  ┌──────────────────┐                                                   │
│  │  Paymaster        │  (Optional — sponsors gas for users)             │
│  └──────────────────┘                                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

## Data Flow: Creating a Session

```
1. Developer app calls SDK → createSession(account, policies, ttl)
2. SDK generates ephemeral keypair (session key)
3. SDK encodes registerSessionKey() call + policy configurations
4. SDK wraps everything in a UserOperation → signed by MASTER KEY (one time)
5. UserOp → Bundler → EntryPoint → Smart Account
6. Smart Account → SessionKeyValidator.registerSessionKey()
7. Smart Account → Each Policy.configure()
8. Session key is now active on-chain
9. SDK returns ActiveSession to the app (includes session private key)
```

## Data Flow: Using a Session Key

```
1. App calls SDK → execute(session, target, data)
2. SDK encodes the call into a UserOperation
3. UserOp is signed by the SESSION KEY (not master key!)
4. UserOp → Bundler → EntryPoint → Smart Account
5. Smart Account → SessionKeyValidator.validateSessionKeyOp()
6. Validator → signature recovery → checks time bounds
7. Validator → loops through all attached Policies
8. Each Policy → checkPolicy() → returns allow/deny
9. If all pass → Smart Account.execute() → target contract
10. After execution → each Policy.updatePolicy() (spending tracking, etc.)
```

## Contract Relationships

```
SessionGuardFactory
  └── deploys → SessionGuardAccount (one per user, EIP-1167 clones)

SessionGuardAccount
  ├── owner (master key — never leaves user's device)
  ├── validators[] (installed modules)
  │    └── SessionKeyValidator
  │         └── sessions[account][sessionKey] → SessionKeyData
  │              ├── validAfter / validUntil
  │              ├── revoked flag
  │              └── policies[] → array of IPolicy contracts
  └── execute() / executeBatch()

IPolicy implementations:
  ├── SpendingLimitPolicy  → maxAmount, spent tracking
  ├── AllowlistPolicy      → target/selector whitelist
  ├── RateLimitPolicy      → ops per time window
  └── GasLimitPolicy       → total gas budget
```

## Security Model

| Layer | Protection |
|-------|-----------|
| Smart Account | Only EntryPoint or owner can execute |
| Session Validator | ECDSA signature verification + time bounds |
| Policies | On-chain enforced — no server trust required |
| EntryPoint | Nonce prevents replay attacks |
| Paymaster | Optional gas sponsorship (doesn't affect custody) |
| Master Key | Never transmitted — signs only once to install session |
