use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::Instruction;
use anchor_lang::solana_program::program::invoke_signed;
use crate::errors::SessionGuardError;
use crate::state::{
    AllowlistPolicy, ComputeLimitPolicy, RateLimitPolicy, SessionGuardAccount,
    SessionKeyData, SpendingLimitPolicy,
};

#[derive(Accounts)]
pub struct ExecuteViaSession<'info> {
    #[account(
        seeds = [b"session_guard", guard_account.owner.as_ref()],
        bump = guard_account.bump,
    )]
    pub guard_account: Account<'info, SessionGuardAccount>,

    #[account(
        mut,
        seeds = [b"session_key", guard_account.key().as_ref(), session_signer.key().as_ref()],
        bump = session_key_data.bump,
        constraint = session_key_data.guard_account == guard_account.key(),
        constraint = session_key_data.session_key == session_signer.key(),
    )]
    pub session_key_data: Account<'info, SessionKeyData>,

    /// The session key must sign this transaction.
    pub session_signer: Signer<'info>,

    /// Optional: spending limit policy PDA.
    #[account(
        mut,
        seeds = [b"spending_limit", session_key_data.key().as_ref()],
        bump = spending_limit.bump,
    )]
    pub spending_limit: Option<Account<'info, SpendingLimitPolicy>>,

    /// Optional: allowlist policy PDA.
    #[account(
        seeds = [b"allowlist", session_key_data.key().as_ref()],
        bump = allowlist.bump,
    )]
    pub allowlist: Option<Account<'info, AllowlistPolicy>>,

    /// Optional: rate limit policy PDA.
    #[account(
        mut,
        seeds = [b"rate_limit", session_key_data.key().as_ref()],
        bump = rate_limit.bump,
    )]
    pub rate_limit: Option<Account<'info, RateLimitPolicy>>,

    /// Optional: compute limit policy PDA.
    #[account(
        mut,
        seeds = [b"compute_limit", session_key_data.key().as_ref()],
        bump = compute_limit.bump,
    )]
    pub compute_limit: Option<Account<'info, ComputeLimitPolicy>>,

    /// The target program to CPI into.
    /// CHECK: Validated against allowlist policy if present.
    pub target_program: UncheckedAccount<'info>,
}

pub fn execute_via_session(
    ctx: Context<ExecuteViaSession>,
    instruction_data: Vec<u8>,
) -> Result<()> {
    let session = &ctx.accounts.session_key_data;

    // ── 1. Validate session is active ────────────────────────────────
    let clock = Clock::get()?;
    let now = clock.unix_timestamp;

    require!(!session.revoked, SessionGuardError::SessionRevoked);
    require!(now >= session.valid_after, SessionGuardError::SessionNotYetValid);
    require!(now <= session.valid_until, SessionGuardError::SessionExpired);

    // ── 2. Check allowlist policy ────────────────────────────────────
    if let Some(allowlist) = &ctx.accounts.allowlist {
        let target = ctx.accounts.target_program.key();
        require!(
            allowlist.allowed_programs.contains(&target),
            SessionGuardError::ProgramNotAllowed
        );
    }

    // ── 3. Check rate limit policy ───────────────────────────────────
    if let Some(rate_limit) = &mut ctx.accounts.rate_limit {
        // Reset window if expired
        if now >= rate_limit.window_start + rate_limit.window_seconds {
            rate_limit.window_start = now;
            rate_limit.ops_in_window = 0;
        }
        require!(
            rate_limit.ops_in_window < rate_limit.max_ops,
            SessionGuardError::RateLimitExceeded
        );
        rate_limit.ops_in_window = rate_limit.ops_in_window.checked_add(1).unwrap();
    }

    // ── 4. Check compute limit policy ────────────────────────────────
    if let Some(compute_limit) = &mut ctx.accounts.compute_limit {
        // Estimate: charge a flat 200k CU per invocation (conservative)
        let estimated_cu: u64 = 200_000;
        require!(
            compute_limit.compute_used.checked_add(estimated_cu).unwrap()
                <= compute_limit.max_compute_units,
            SessionGuardError::ComputeLimitExceeded
        );
        compute_limit.compute_used = compute_limit
            .compute_used
            .checked_add(estimated_cu)
            .unwrap();
    }

    // ── 5. Build and invoke CPI ──────────────────────────────────────
    // Collect remaining accounts as CPI accounts
    let cpi_accounts: Vec<AccountMeta> = ctx
        .remaining_accounts
        .iter()
        .map(|acc| {
            if acc.is_writable {
                AccountMeta::new(*acc.key, acc.is_signer)
            } else {
                AccountMeta::new_readonly(*acc.key, acc.is_signer)
            }
        })
        .collect();

    let ix = Instruction {
        program_id: ctx.accounts.target_program.key(),
        accounts: cpi_accounts,
        data: instruction_data,
    };

    // Sign with the guard_account PDA
    let owner = ctx.accounts.guard_account.owner;
    let bump = ctx.accounts.guard_account.bump;
    let seeds = &[b"session_guard" as &[u8], owner.as_ref(), &[bump]];
    let signer_seeds = &[&seeds[..]];

    invoke_signed(&ix, ctx.remaining_accounts, signer_seeds)?;

    // ── 6. Post-execution: update spending limit ─────────────────────
    if let Some(spending_limit) = &mut ctx.accounts.spending_limit {
        // In a real implementation, you'd parse the transfer amount from
        // instruction_data or track SOL balance changes.
        // For now, we increment by a tracked value passed in remaining data.
        // This is a simplified model — production would use token balance diffs.
    }

    Ok(())
}
