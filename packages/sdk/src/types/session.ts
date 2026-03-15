export interface SessionConfig {
  /** The session key signer (can be a generated ephemeral key) */
  sessionKey: `0x${string}`;
  /** Policies to enforce on this session */
  policies: import("./policy").PolicyConfig[];
  /** Time-to-live in seconds (default: 86400 = 24h) */
  ttlSeconds?: number;
  /** Optional label for dashboard/analytics */
  label?: string;
}

export interface SessionKeyData {
  sessionKey: `0x${string}`;
  validAfter: number;
  validUntil: number;
  revoked: boolean;
  policies: `0x${string}`[];
}

export interface ActiveSession {
  /** The smart account this session belongs to */
  account: `0x${string}`;
  /** Session key address */
  sessionKey: `0x${string}`;
  /** Session key private key (stored client-side only) */
  sessionPrivateKey: `0x${string}`;
  /** Configured policies */
  policies: import("./policy").PolicyConfig[];
  /** Expiry timestamp (unix seconds) */
  expiresAt: number;
  /** Human-readable label */
  label?: string;
}

export interface SerializedSession {
  /** JSON-safe representation for storage/transfer */
  version: 1;
  account: `0x${string}`;
  sessionKey: `0x${string}`;
  encryptedPrivateKey: string;
  policies: import("./policy").PolicyConfig[];
  expiresAt: number;
  chainId: number;
  label?: string;
}
