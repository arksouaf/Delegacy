import type { SolanaPolicyConfig } from "./policy";

export interface SolanaSessionConfig {
  /** The session key public key (generated ephemeral Ed25519 keypair) */
  sessionKey: string;
  /** Policies to enforce on this session */
  policies: SolanaPolicyConfig[];
  /** Time-to-live in seconds (default: 86400 = 24h) */
  ttlSeconds?: number;
  /** Optional label for dashboard/analytics */
  label?: string;
}

export interface SolanaSessionKeyData {
  sessionKey: string;
  validAfter: number;
  validUntil: number;
  revoked: boolean;
  policyCount: number;
}

export interface SolanaActiveSession {
  /** The SessionGuard account PDA this session belongs to */
  guardAccount: string;
  /** Owner's wallet public key */
  owner: string;
  /** Session key public key */
  sessionKey: string;
  /** Session key secret key (Uint8Array — stored client-side only) */
  sessionSecretKey: Uint8Array;
  /** Session key data PDA address */
  sessionKeyDataPda: string;
  /** Configured policies */
  policies: SolanaPolicyConfig[];
  /** Expiry timestamp (unix seconds) */
  expiresAt: number;
  /** Human-readable label */
  label?: string;
}

export interface SolanaSerializedSession {
  /** JSON-safe representation for storage/transfer */
  version: 1;
  guardAccount: string;
  owner: string;
  sessionKey: string;
  /** Base64-encoded secret key */
  encryptedSecretKey: string;
  sessionKeyDataPda: string;
  policies: SolanaPolicyConfig[];
  expiresAt: number;
  cluster: string;
  label?: string;
}
