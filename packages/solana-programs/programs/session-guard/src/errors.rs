use anchor_lang::prelude::*;

#[error_code]
pub enum SessionGuardError {
    /// Session key has expired (current time > valid_until).
    #[msg("Session key has expired")]
    SessionExpired,

    /// Session key is not yet valid (current time < valid_after).
    #[msg("Session key is not yet valid")]
    SessionNotYetValid,

    /// Session key has been revoked.
    #[msg("Session key has been revoked")]
    SessionRevoked,

    /// Target program is not in the session's allowlist.
    #[msg("Target program not in allowlist")]
    ProgramNotAllowed,

    /// Spending limit exceeded.
    #[msg("Spending limit exceeded")]
    SpendingLimitExceeded,

    /// Rate limit exceeded (too many operations in the time window).
    #[msg("Rate limit exceeded")]
    RateLimitExceeded,

    /// Compute unit budget exceeded.
    #[msg("Compute unit limit exceeded")]
    ComputeLimitExceeded,

    /// Invalid validity window (valid_after >= valid_until).
    #[msg("Invalid validity window")]
    InvalidValidityWindow,

    /// Unauthorized — signer is not the owner.
    #[msg("Unauthorized: not the account owner")]
    Unauthorized,

    /// Session key is already revoked.
    #[msg("Session key is already revoked")]
    AlreadyRevoked,

    /// Maximum number of allowed programs exceeded.
    #[msg("Too many allowed programs (max 20)")]
    TooManyAllowedPrograms,
}
