# Solana Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Developer's Application                         │
│                  (Game, DeFi App, Commerce Platform)                    │
└────────────────────┬──────────────────────────────────┬─────────────────┘
                     │ SDK (@sessionguard/solana-sdk)    │  REST API
                     ▼                                   ▼
┌────────────────────────────────────┐  ┌──────────────────────────────┐
│    SolanaSessionGuardClient        │  │    SessionGuard API          │
│  ┌─────────────┐ ┌──────────────┐  │  │  ┌────────────────────────┐  │
│  │ SessionKey   │ │ Transaction  │  │  │  │ /api/v1/solana/        │  │
│  │ Manager      │ │ Builder      │  │  │  │   accounts             │  │
│  └──────┬───────┘ └──────┬───────┘  │  │  │   sessions             │  │
│         │                │          │  │  │   transactions          │  │
│  ┌──────┴────────────────┴───────┐  │  │  └────────────────────────┘  │
│  │ Policy Builders               │  │  │  Auth + Rate Limiting       │
│  │ (Spending, Allowlist, Rate,   │  │  └──────────────┬───────────────┘
│  │  Compute, TimeBound)          │  │                  │
│  └───────────────────────────────┘  │                  │
└────────────────────┬────────────────┘                  │
                     │                                   │
                     ▼                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        Solana RPC Node                                  │
│                  (Sends transactions directly)                          │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Solana Blockchain                                │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  SessionGuard Program (Anchor)                                   │   │
│  │                                                                  │   │
│  │  ┌──────────────────┐  ┌──────────────────────────────────────┐  │   │
│  │  │ SessionGuard     │  │ Session Key Data (PDA)               │  │   │
│  │  │ Account (PDA)    │  │  ├── valid_after / valid_until       │  │   │
│  │  │  ├── owner       │  │  ├── revoked flag                    │  │   │
│  │  │  ├── session_cnt │  │  └── policy_count                    │  │   │
│  │  │  └── bump        │  └──────────────────────────────────────┘  │   │
│  │  └──────────────────┘                                            │   │
│  │                                                                  │   │
│  │  ┌────────────────────────────────────────────────────────────┐  │   │
│  │  │ Policy PDAs                                                │  │   │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │  │   │
│  │  │  │ Spending     │  │ Allowlist    │  │ Rate Limit   │     │  │   │
│  │  │  │ Limit PDA    │  │ PDA         │  │ PDA          │     │  │   │
│  │  │  └──────────────┘  └──────────────┘  └──────────────┘     │  │   │
│  │  │  ┌──────────────┐                                          │  │   │
│  │  │  │ Compute      │                                          │  │   │
│  │  │  │ Limit PDA    │                                          │  │   │
│  │  │  └──────────────┘                                          │  │   │
│  │  └────────────────────────────────────────────────────────────┘  │   │
│  │                                                                  │   │
│  │  execute_via_session → CPI → Target Program                      │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Target Programs (Jupiter, Raydium, Game contracts, etc.)        │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

## Key Differences from EVM Architecture

| Aspect | EVM (ERC-4337) | Solana |
|--------|---------------|--------|
| Account Model | Smart contract wallets | PDAs (Program Derived Addresses) |
| Transaction Flow | UserOp → Bundler → EntryPoint → Account | Transaction → RPC → Program directly |
| Signature Scheme | ECDSA (secp256k1) | Ed25519 |
| Gas/Compute | Gas units + EIP-1559 pricing | Compute units (200K default per instruction) |
| Policy Storage | Separate contract per policy type | PDA per policy instance, same program |
| Session Storage | Mapping in validator contract | PDA per session key |
| Delegation | `validateUserOp()` module | CPI with `invoke_signed()` |
| Replay Protection | EntryPoint nonce | Solana native transaction nonce |
| Deployment | Factory deploys clone per user | PDA derivation (no deployment tx needed) |

## Data Flow: Creating a Session

```
1. Developer app calls SDK → createSession(owner, guardAccount, policies, ttl)
2. SDK generates Ed25519 keypair (session key)
3. SDK builds registerSessionKey instruction (guard PDA + session PDA derivation)
4. Transaction signed by OWNER KEYPAIR (one time)
5. Transaction → Solana RPC → SessionGuard Program
6. Program → initializes SessionKeyData PDA
7. Program → initializes each Policy PDA (one tx per policy config)
8. Session key is now active on-chain
9. SDK returns SolanaActiveSession (includes session secret key)
```

## Data Flow: Using a Session Key

```
1. App calls SDK → execute(session, targetProgram, instructionData)
2. SDK builds execute_via_session instruction
3. Transaction signed by the SESSION KEY (not owner!)
4. Transaction → Solana RPC → SessionGuard Program
5. Program → loads SessionKeyData PDA → checks time bounds
6. Program → checks revoked flag
7. Program → loads AllowlistPolicy PDA → verifies target program
8. Program → loads RateLimitPolicy PDA → checks ops count
9. Program → loads SpendingLimitPolicy PDA → checks budget
10. Program → loads ComputeLimitPolicy PDA → checks compute budget
11. If all pass → CPI invoke_signed() → target program
12. After CPI → updates rate limit counter, spending tracker, compute tracker
```

## PDA Account Relationships

```
SessionGuard Program
  └── derives → SessionGuardAccount PDA (per user)
       Seeds: ["session_guard", owner_pubkey]
       Fields: owner, session_count, bump

  └── derives → SessionKeyData PDA (per session)
       Seeds: ["session_key", guard_account, session_pubkey]
       Fields: guard_account, session_key, valid_after, valid_until,
               revoked, policy_count, bump

  └── derives → SpendingLimitPolicy PDA
       Seeds: ["spending_limit", session_key_data_pda]
       Fields: max_amount, amount_spent

  └── derives → AllowlistPolicy PDA
       Seeds: ["allowlist", session_key_data_pda]
       Fields: allowed_programs (Vec<Pubkey>, max 10)

  └── derives → RateLimitPolicy PDA
       Seeds: ["rate_limit", session_key_data_pda]
       Fields: max_ops, window_seconds, ops_count, window_start

  └── derives → ComputeLimitPolicy PDA
       Seeds: ["compute_limit", session_key_data_pda]
       Fields: max_compute_units, compute_units_used
```

## Security Model

| Layer | Protection |
|-------|-----------|
| SessionGuard PDA | Only owner can register/revoke session keys |
| Session Key Data | Ed25519 signature verification + time bounds |
| Policies | On-chain enforced — no server trust required |
| Solana Runtime | Native replay protection via recent blockhash |
| CPI Invoke Signed | Program acts as signing authority for delegated calls |
| PDA Derivation | Deterministic, collision-resistant account addressing |
| Owner Key | Never transmitted — signs only once to install session |

## Anchor Program Structure

```
programs/session-guard/src/
├── lib.rs              # Program entry point — 8 instructions
├── state.rs            # Account structs (SessionGuardAccount, SessionKeyData, 4 policies)
├── errors.rs           # SessionGuardError enum (10 variants)
└── instructions/
    ├── mod.rs           # Module re-exports
    ├── account.rs       # InitializeAccount handler
    ├── session.rs       # RegisterSessionKey / RevokeSessionKey handlers
    ├── policies.rs      # 4 policy config handlers (spending, allowlist, rate, compute)
    └── execute.rs       # ExecuteViaSession — validation pipeline + CPI
```

## Compute Budget

Solana allocates compute units (CUs) per transaction:

| Operation | Estimated CUs |
|-----------|--------------|
| InitializeAccount | ~15,000 |
| RegisterSessionKey | ~25,000 |
| ConfigurePolicy (each) | ~10,000 |
| ExecuteViaSession (validation) | ~50,000 |
| CPI to target program | Variable (200K default) |
| Full session creation (4 policies) | ~65,000 |

Maximum per transaction: **1,400,000 CUs** (Solana limit).
SessionGuard operations stay well within this budget.
