import { PublicKey } from "@solana/web3.js";

/** SessionGuard program ID (must match deployed program) */
const PROGRAM_ID = new PublicKey("SGrd1111111111111111111111111111111111111111");

/**
 * Derive the SessionGuard account PDA for an owner.
 * Seeds: ["session_guard", owner_pubkey]
 */
export function deriveGuardPda(owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("session_guard"), owner.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Derive the session key data PDA.
 * Seeds: ["session_key", guard_account, session_pubkey]
 */
export function deriveSessionPda(
  guardAccount: PublicKey,
  sessionKey: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("session_key"), guardAccount.toBuffer(), sessionKey.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Derive the spending limit policy PDA.
 * Seeds: ["spending_limit", session_key_data]
 */
export function deriveSpendingLimitPda(sessionKeyData: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("spending_limit"), sessionKeyData.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Derive the allowlist policy PDA.
 * Seeds: ["allowlist", session_key_data]
 */
export function deriveAllowlistPda(sessionKeyData: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("allowlist"), sessionKeyData.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Derive the rate limit policy PDA.
 * Seeds: ["rate_limit", session_key_data]
 */
export function deriveRateLimitPda(sessionKeyData: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("rate_limit"), sessionKeyData.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Derive the compute limit policy PDA.
 * Seeds: ["compute_limit", session_key_data]
 */
export function deriveComputeLimitPda(sessionKeyData: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("compute_limit"), sessionKeyData.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Parse a human-readable duration string into seconds.
 * Supports: "30s", "5m", "2h", "7d", "1w"
 */
export function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)(s|m|h|d|w)$/);
  if (!match) throw new Error(`Invalid duration: ${duration}`);

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3_600,
    d: 86_400,
    w: 604_800,
  };

  return value * multipliers[unit];
}
