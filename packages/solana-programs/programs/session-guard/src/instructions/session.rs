use anchor_lang::prelude::*;
use crate::errors::SessionGuardError;
use crate::state::{SessionGuardAccount, SessionKeyData};

#[derive(Accounts)]
pub struct RegisterSessionKey<'info> {
    #[account(
        mut,
        seeds = [b"session_guard", owner.key().as_ref()],
        bump = guard_account.bump,
        has_one = owner @ SessionGuardError::Unauthorized,
    )]
    pub guard_account: Account<'info, SessionGuardAccount>,

    #[account(
        init,
        payer = owner,
        space = 8 + SessionKeyData::INIT_SPACE,
        seeds = [b"session_key", guard_account.key().as_ref(), session_pubkey.key().as_ref()],
        bump,
    )]
    pub session_key_data: Account<'info, SessionKeyData>,

    /// The public key of the new session key (does not need to sign here;
    /// the owner authorizes registration).
    /// CHECK: This is the ephemeral session pubkey — not validated beyond being a valid pubkey.
    pub session_pubkey: UncheckedAccount<'info>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn register_session_key(
    ctx: Context<RegisterSessionKey>,
    valid_after: i64,
    valid_until: i64,
) -> Result<()> {
    require!(valid_after < valid_until, SessionGuardError::InvalidValidityWindow);

    let guard = &mut ctx.accounts.guard_account;
    let session = &mut ctx.accounts.session_key_data;

    session.guard_account = guard.key();
    session.session_key = ctx.accounts.session_pubkey.key();
    session.valid_after = valid_after;
    session.valid_until = valid_until;
    session.revoked = false;
    session.policy_count = 0;
    session.bump = ctx.bumps.session_key_data;

    guard.session_count = guard.session_count.checked_add(1).unwrap();

    Ok(())
}

#[derive(Accounts)]
pub struct RevokeSessionKey<'info> {
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

    pub owner: Signer<'info>,
}

pub fn revoke_session_key(ctx: Context<RevokeSessionKey>) -> Result<()> {
    let session = &mut ctx.accounts.session_key_data;
    require!(!session.revoked, SessionGuardError::AlreadyRevoked);
    session.revoked = true;
    Ok(())
}
