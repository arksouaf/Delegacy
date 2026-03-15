// ─── SessionGuard Solana Program ────────────────────────────────────────
// Anchor-based session key infrastructure for Solana.
//
// Architecture:
//   - SessionGuardAccount (PDA per owner) — holds owner pubkey, session count
//   - SessionKeyData (PDA per session key) — validity window, revoked flag, policies
//   - Policy accounts (PDAs) — SpendingLimit, Allowlist, RateLimit, ComputeLimit
//
// Unlike EVM's ERC-4337, Solana doesn't have account abstraction natively.
// Instead, session keys sign transactions that invoke this program, which
// validates the session and proxies the CPI call to the target program.

use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("SGrd1111111111111111111111111111111111111111");

#[program]
pub mod session_guard {
    use super::*;

    // ─── Account Management ──────────────────────────────────────────

    /// Initialize a SessionGuard account for an owner.
    /// Creates a PDA that tracks session keys and acts as the delegating authority.
    pub fn initialize_account(ctx: Context<InitializeAccount>) -> Result<()> {
        instructions::account::initialize_account(ctx)
    }

    // ─── Session Key Management ──────────────────────────────────────

    /// Register a new session key with a validity window.
    /// Must be signed by the account owner (master key).
    pub fn register_session_key(
        ctx: Context<RegisterSessionKey>,
        valid_after: i64,
        valid_until: i64,
    ) -> Result<()> {
        instructions::session::register_session_key(ctx, valid_after, valid_until)
    }

    /// Revoke an active session key. Can be called by owner at any time.
    pub fn revoke_session_key(ctx: Context<RevokeSessionKey>) -> Result<()> {
        instructions::session::revoke_session_key(ctx)
    }

    // ─── Policy Configuration ────────────────────────────────────────

    /// Attach a spending limit policy to a session key.
    pub fn configure_spending_limit(
        ctx: Context<ConfigureSpendingLimit>,
        max_amount: u64,
        token_mint: Option<Pubkey>,
    ) -> Result<()> {
        instructions::policies::configure_spending_limit(ctx, max_amount, token_mint)
    }

    /// Attach an allowlist policy to a session key.
    pub fn configure_allowlist(
        ctx: Context<ConfigureAllowlist>,
        allowed_programs: Vec<Pubkey>,
    ) -> Result<()> {
        instructions::policies::configure_allowlist(ctx, allowed_programs)
    }

    /// Attach a rate limit policy to a session key.
    pub fn configure_rate_limit(
        ctx: Context<ConfigureRateLimit>,
        max_ops: u32,
        window_seconds: i64,
    ) -> Result<()> {
        instructions::policies::configure_rate_limit(ctx, max_ops, window_seconds)
    }

    /// Attach a compute unit limit policy to a session key.
    pub fn configure_compute_limit(
        ctx: Context<ConfigureComputeLimit>,
        max_compute_units: u64,
    ) -> Result<()> {
        instructions::policies::configure_compute_limit(ctx, max_compute_units)
    }

    // ─── Execution (via session key) ─────────────────────────────────

    /// Execute a CPI call using a session key.
    /// The session key signs this transaction; the program validates policies
    /// and proxies the call to the target program.
    pub fn execute_via_session(
        ctx: Context<ExecuteViaSession>,
        instruction_data: Vec<u8>,
    ) -> Result<()> {
        instructions::execute::execute_via_session(ctx, instruction_data)
    }
}
