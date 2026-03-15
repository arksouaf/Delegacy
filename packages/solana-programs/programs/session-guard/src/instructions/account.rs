use anchor_lang::prelude::*;
use crate::state::SessionGuardAccount;

#[derive(Accounts)]
pub struct InitializeAccount<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + SessionGuardAccount::INIT_SPACE,
        seeds = [b"session_guard", owner.key().as_ref()],
        bump,
    )]
    pub guard_account: Account<'info, SessionGuardAccount>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn initialize_account(ctx: Context<InitializeAccount>) -> Result<()> {
    let guard = &mut ctx.accounts.guard_account;
    guard.owner = ctx.accounts.owner.key();
    guard.session_count = 0;
    guard.bump = ctx.bumps.guard_account;
    Ok(())
}
