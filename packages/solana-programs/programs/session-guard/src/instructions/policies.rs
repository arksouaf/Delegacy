use anchor_lang::prelude::*;
use crate::errors::SessionGuardError;
use crate::state::{
    AllowlistPolicy, ComputeLimitPolicy, RateLimitPolicy, SessionGuardAccount,
    SessionKeyData, SpendingLimitPolicy,
};

// ─── Spending Limit ──────────────────────────────────────────────────

#[derive(Accounts)]
pub struct ConfigureSpendingLimit<'info> {
    #[account(
        seeds = [b"session_guard", owner.key().as_ref()],
        bump = guard_account.bump,
        has_one = owner @ SessionGuardError::Unauthorized,
    )]
    pub guard_account: Account<'info, SessionGuardAccount>,

    #[account(
        mut,
        seeds = [b"session_key", guard_account.key().as_ref(), session_key_data.session_key.as_ref()],
        bump = session_key_data.bump,
        constraint = session_key_data.guard_account == guard_account.key(),
    )]
    pub session_key_data: Account<'info, SessionKeyData>,

    #[account(
        init,
        payer = owner,
        space = 8 + SpendingLimitPolicy::INIT_SPACE,
        seeds = [b"spending_limit", session_key_data.key().as_ref()],
        bump,
    )]
    pub spending_limit: Account<'info, SpendingLimitPolicy>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn configure_spending_limit(
    ctx: Context<ConfigureSpendingLimit>,
    max_amount: u64,
    token_mint: Option<Pubkey>,
) -> Result<()> {
    let policy = &mut ctx.accounts.spending_limit;
    policy.session_key_data = ctx.accounts.session_key_data.key();
    policy.max_amount = max_amount;
    policy.amount_spent = 0;
    policy.token_mint = token_mint.unwrap_or(Pubkey::default());
    policy.bump = ctx.bumps.spending_limit;

    let session = &mut ctx.accounts.session_key_data;
    session.policy_count = session.policy_count.checked_add(1).unwrap();

    Ok(())
}

// ─── Allowlist ───────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(allowed_programs: Vec<Pubkey>)]
pub struct ConfigureAllowlist<'info> {
    #[account(
        seeds = [b"session_guard", owner.key().as_ref()],
        bump = guard_account.bump,
        has_one = owner @ SessionGuardError::Unauthorized,
    )]
    pub guard_account: Account<'info, SessionGuardAccount>,

    #[account(
        mut,
        seeds = [b"session_key", guard_account.key().as_ref(), session_key_data.session_key.as_ref()],
        bump = session_key_data.bump,
        constraint = session_key_data.guard_account == guard_account.key(),
    )]
    pub session_key_data: Account<'info, SessionKeyData>,

    #[account(
        init,
        payer = owner,
        // 8 (discriminator) + 32 (session_key_data) + 4 (vec len) + 32*N (pubkeys) + 1 (bump)
        space = 8 + 32 + 4 + (32 * allowed_programs.len()) + 1,
        seeds = [b"allowlist", session_key_data.key().as_ref()],
        bump,
    )]
    pub allowlist: Account<'info, AllowlistPolicy>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn configure_allowlist(
    ctx: Context<ConfigureAllowlist>,
    allowed_programs: Vec<Pubkey>,
) -> Result<()> {
    require!(
        allowed_programs.len() <= 20,
        SessionGuardError::TooManyAllowedPrograms
    );

    let policy = &mut ctx.accounts.allowlist;
    policy.session_key_data = ctx.accounts.session_key_data.key();
    policy.allowed_programs = allowed_programs;
    policy.bump = ctx.bumps.allowlist;

    let session = &mut ctx.accounts.session_key_data;
    session.policy_count = session.policy_count.checked_add(1).unwrap();

    Ok(())
}

// ─── Rate Limit ──────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct ConfigureRateLimit<'info> {
    #[account(
        seeds = [b"session_guard", owner.key().as_ref()],
        bump = guard_account.bump,
        has_one = owner @ SessionGuardError::Unauthorized,
    )]
    pub guard_account: Account<'info, SessionGuardAccount>,

    #[account(
        mut,
        seeds = [b"session_key", guard_account.key().as_ref(), session_key_data.session_key.as_ref()],
        bump = session_key_data.bump,
        constraint = session_key_data.guard_account == guard_account.key(),
    )]
    pub session_key_data: Account<'info, SessionKeyData>,

    #[account(
        init,
        payer = owner,
        space = 8 + RateLimitPolicy::INIT_SPACE,
        seeds = [b"rate_limit", session_key_data.key().as_ref()],
        bump,
    )]
    pub rate_limit: Account<'info, RateLimitPolicy>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn configure_rate_limit(
    ctx: Context<ConfigureRateLimit>,
    max_ops: u32,
    window_seconds: i64,
) -> Result<()> {
    let clock = Clock::get()?;
    let policy = &mut ctx.accounts.rate_limit;
    policy.session_key_data = ctx.accounts.session_key_data.key();
    policy.max_ops = max_ops;
    policy.window_seconds = window_seconds;
    policy.window_start = clock.unix_timestamp;
    policy.ops_in_window = 0;
    policy.bump = ctx.bumps.rate_limit;

    let session = &mut ctx.accounts.session_key_data;
    session.policy_count = session.policy_count.checked_add(1).unwrap();

    Ok(())
}

// ─── Compute Limit ───────────────────────────────────────────────────

#[derive(Accounts)]
pub struct ConfigureComputeLimit<'info> {
    #[account(
        seeds = [b"session_guard", owner.key().as_ref()],
        bump = guard_account.bump,
        has_one = owner @ SessionGuardError::Unauthorized,
    )]
    pub guard_account: Account<'info, SessionGuardAccount>,

    #[account(
        mut,
        seeds = [b"session_key", guard_account.key().as_ref(), session_key_data.session_key.as_ref()],
        bump = session_key_data.bump,
        constraint = session_key_data.guard_account == guard_account.key(),
    )]
    pub session_key_data: Account<'info, SessionKeyData>,

    #[account(
        init,
        payer = owner,
        space = 8 + ComputeLimitPolicy::INIT_SPACE,
        seeds = [b"compute_limit", session_key_data.key().as_ref()],
        bump,
    )]
    pub compute_limit: Account<'info, ComputeLimitPolicy>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn configure_compute_limit(
    ctx: Context<ConfigureComputeLimit>,
    max_compute_units: u64,
) -> Result<()> {
    let policy = &mut ctx.accounts.compute_limit;
    policy.session_key_data = ctx.accounts.session_key_data.key();
    policy.max_compute_units = max_compute_units;
    policy.compute_used = 0;
    policy.bump = ctx.bumps.compute_limit;

    let session = &mut ctx.accounts.session_key_data;
    session.policy_count = session.policy_count.checked_add(1).unwrap();

    Ok(())
}
