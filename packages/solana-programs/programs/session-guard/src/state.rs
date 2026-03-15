use anchor_lang::prelude::*;

/// A SessionGuard account — one per owner wallet.
/// PDA seeds: ["session_guard", owner.key()]
#[account]
#[derive(InitSpace)]
pub struct SessionGuardAccount {
    /// The owner's wallet (master key). Only this key can register/revoke session keys.
    pub owner: Pubkey,
    /// Total number of session keys ever registered (used as counter for PDA derivation).
    pub session_count: u64,
    /// Bump seed for this PDA.
    pub bump: u8,
}

/// Data for a single session key.
/// PDA seeds: ["session_key", guard_account.key(), session_pubkey.key()]
#[account]
#[derive(InitSpace)]
pub struct SessionKeyData {
    /// The SessionGuard account this session belongs to.
    pub guard_account: Pubkey,
    /// The session key's public key (an ephemeral Ed25519 keypair).
    pub session_key: Pubkey,
    /// Unix timestamp: session is valid after this time.
    pub valid_after: i64,
    /// Unix timestamp: session expires at this time.
    pub valid_until: i64,
    /// Whether this session has been revoked.
    pub revoked: bool,
    /// Number of policy accounts attached.
    pub policy_count: u8,
    /// Bump seed for this PDA.
    pub bump: u8,
}

/// Spending limit policy account.
/// PDA seeds: ["spending_limit", session_key_data.key()]
#[account]
#[derive(InitSpace)]
pub struct SpendingLimitPolicy {
    /// The session key this policy is attached to.
    pub session_key_data: Pubkey,
    /// Maximum amount in lamports (native SOL) or token smallest unit.
    pub max_amount: u64,
    /// Amount already spent in this session.
    pub amount_spent: u64,
    /// Optional token mint (Pubkey::default() = native SOL).
    pub token_mint: Pubkey,
    /// Bump seed.
    pub bump: u8,
}

/// Allowlist policy — restricts which programs the session key can invoke.
/// PDA seeds: ["allowlist", session_key_data.key()]
#[account]
pub struct AllowlistPolicy {
    /// The session key this policy is attached to.
    pub session_key_data: Pubkey,
    /// List of allowed program IDs the session key can CPI into.
    pub allowed_programs: Vec<Pubkey>,
    /// Bump seed.
    pub bump: u8,
}

/// Rate limit policy.
/// PDA seeds: ["rate_limit", session_key_data.key()]
#[account]
#[derive(InitSpace)]
pub struct RateLimitPolicy {
    /// The session key this policy is attached to.
    pub session_key_data: Pubkey,
    /// Maximum operations per window.
    pub max_ops: u32,
    /// Window size in seconds.
    pub window_seconds: i64,
    /// Timestamp of window start.
    pub window_start: i64,
    /// Operations performed in current window.
    pub ops_in_window: u32,
    /// Bump seed.
    pub bump: u8,
}

/// Compute unit limit policy (Solana equivalent of gas limit).
/// PDA seeds: ["compute_limit", session_key_data.key()]
#[account]
#[derive(InitSpace)]
pub struct ComputeLimitPolicy {
    /// The session key this policy is attached to.
    pub session_key_data: Pubkey,
    /// Maximum total compute units for the session's lifetime.
    pub max_compute_units: u64,
    /// Compute units consumed so far.
    pub compute_used: u64,
    /// Bump seed.
    pub bump: u8,
}
