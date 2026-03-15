import type { ActiveSession, SerializedSession } from "../types/session";
import type { PolicyConfig } from "../types/policy";
import type { SessionGuardClientConfig } from "./SessionGuardClient";

/**
 * SessionKeyManager — Manages session key lifecycle
 *
 * Handles creation, storage, revocation, serialization, and restoration
 * of ephemeral session keys.
 */
export class SessionKeyManager {
  private config: SessionGuardClientConfig;
  private activeSessions: Map<string, ActiveSession> = new Map();

  constructor(config: SessionGuardClientConfig) {
    this.config = config;
  }

  /**
   * Generate a new ephemeral session key and register it on-chain
   */
  async createSession(params: {
    account: `0x${string}`;
    policies: PolicyConfig[];
    ttlSeconds: number;
    label?: string;
  }): Promise<ActiveSession> {
    // 1. Generate ephemeral keypair
    const sessionPrivateKey = this._generatePrivateKey();
    const sessionKey = this._deriveAddress(sessionPrivateKey);

    // 2. Calculate validity window
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + params.ttlSeconds;

    // 3. Register on-chain via the validator contract
    //    (This would submit a UserOp signed by the master key)
    await this._registerOnChain(params.account, sessionKey, now, expiresAt, params.policies);

    // 4. Configure policies on-chain
    await this._configurePolicies(params.account, sessionKey, params.policies);

    const session: ActiveSession = {
      account: params.account,
      sessionKey,
      sessionPrivateKey,
      policies: params.policies,
      expiresAt,
      label: params.label,
    };

    // Store locally
    const key = `${params.account}:${sessionKey}`;
    this.activeSessions.set(key, session);

    return session;
  }

  /**
   * Revoke a session key on-chain and remove from local storage
   */
  async revokeSession(account: `0x${string}`, sessionKey: `0x${string}`): Promise<void> {
    // Submit revocation UserOp (signed by master key or the account itself)
    // Real implementation calls validator.revokeSessionKey(sessionKey)
    const key = `${account}:${sessionKey}`;
    this.activeSessions.delete(key);
  }

  /**
   * List all locally-tracked active sessions for an account
   */
  async listSessions(account: `0x${string}`): Promise<ActiveSession[]> {
    const sessions: ActiveSession[] = [];
    const now = Math.floor(Date.now() / 1000);

    for (const [key, session] of this.activeSessions) {
      if (session.account === account && session.expiresAt > now) {
        sessions.push(session);
      }
    }
    return sessions;
  }

  /**
   * Serialize session for persistent storage
   */
  serialize(session: ActiveSession, chainId: number): SerializedSession {
    return {
      version: 1,
      account: session.account,
      sessionKey: session.sessionKey,
      encryptedPrivateKey: session.sessionPrivateKey, // TODO: encrypt with user password
      policies: session.policies,
      expiresAt: session.expiresAt,
      chainId,
      label: session.label,
    };
  }

  /**
   * Restore session from serialized data
   */
  deserialize(data: SerializedSession): ActiveSession {
    const session: ActiveSession = {
      account: data.account,
      sessionKey: data.sessionKey,
      sessionPrivateKey: data.encryptedPrivateKey as `0x${string}`, // TODO: decrypt
      policies: data.policies,
      expiresAt: data.expiresAt,
      label: data.label,
    };

    const key = `${data.account}:${data.sessionKey}`;
    this.activeSessions.set(key, session);
    return session;
  }

  // ─── Private Helpers ──────────────────────────────────────────────

  private _generatePrivateKey(): `0x${string}` {
    // Generate cryptographically random 32 bytes
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return `0x${Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("")}` as `0x${string}`;
  }

  private _deriveAddress(privateKey: `0x${string}`): `0x${string}` {
    // Real implementation: derive public key → keccak256 → take last 20 bytes
    // Would use viem's privateKeyToAddress
    return `0x${"0".repeat(40)}` as `0x${string}`;
  }

  private async _registerOnChain(
    account: `0x${string}`,
    sessionKey: `0x${string}`,
    validAfter: number,
    validUntil: number,
    policies: PolicyConfig[]
  ): Promise<void> {
    // Encode validator.registerSessionKey(sessionKey, validAfter, validUntil, policyAddresses)
    // Submit as UserOp signed by master key
    // This is the one-time master key signature
  }

  private async _configurePolicies(
    account: `0x${string}`,
    sessionKey: `0x${string}`,
    policies: PolicyConfig[]
  ): Promise<void> {
    // For each policy, call its configure function on-chain
    for (const policy of policies) {
      switch (policy.type) {
        case "spending-limit":
          // Call spendPolicy.configureLimit(account, sessionKey, maxAmount)
          break;
        case "allowlist":
          // Call allowlistPolicy.configureAllowlist(account, sessionKey, targets, selectors)
          break;
        case "rate-limit":
          // Call ratePolicy.configureRate(account, sessionKey, maxOps, windowSeconds)
          break;
        case "gas-limit":
          // Call gasPolicy.configureGasLimit(account, sessionKey, maxGas)
          break;
      }
    }
  }
}
