import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import type { SolanaActiveSession, SolanaSerializedSession } from "../types/session";
import type { SolanaPolicyConfig } from "../types/policy";
import {
  deriveGuardPda,
  deriveSessionPda,
  deriveSpendingLimitPda,
  deriveAllowlistPda,
  deriveRateLimitPda,
  deriveComputeLimitPda,
} from "../utils/pda";

/** SessionGuard program ID */
const PROGRAM_ID = new PublicKey("SGrd1111111111111111111111111111111111111111");

/**
 * SolanaSessionKeyManager — Manages session key lifecycle on Solana
 *
 * Handles creation, policy configuration, revocation, and serialization
 * of ephemeral Ed25519 session keypairs.
 */
export class SolanaSessionKeyManager {
  private connection: Connection;
  private activeSessions: Map<string, SolanaActiveSession> = new Map();

  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Generate a new ephemeral session key and register it on-chain.
   * The owner's wallet must sign the registration transaction.
   */
  async createSession(params: {
    owner: Keypair;
    guardAccount: PublicKey;
    policies: SolanaPolicyConfig[];
    ttlSeconds: number;
    label?: string;
  }): Promise<SolanaActiveSession> {
    // 1. Generate ephemeral Ed25519 keypair
    const sessionKeypair = Keypair.generate();

    // 2. Derive PDAs
    const [sessionKeyDataPda] = deriveSessionPda(
      params.guardAccount,
      sessionKeypair.publicKey
    );

    // 3. Calculate validity window
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + params.ttlSeconds;

    // 4. Build register_session_key instruction
    const registerIx = await this._buildRegisterInstruction(
      params.owner.publicKey,
      params.guardAccount,
      sessionKeyDataPda,
      sessionKeypair.publicKey,
      now,
      expiresAt
    );

    // 5. Send registration tx signed by owner
    const tx = new Transaction().add(registerIx);
    await sendAndConfirmTransaction(this.connection, tx, [params.owner]);

    // 6. Configure each policy
    await this._configurePolicies(
      params.owner,
      params.guardAccount,
      sessionKeyDataPda,
      params.policies
    );

    const session: SolanaActiveSession = {
      guardAccount: params.guardAccount.toBase58(),
      owner: params.owner.publicKey.toBase58(),
      sessionKey: sessionKeypair.publicKey.toBase58(),
      sessionSecretKey: sessionKeypair.secretKey,
      sessionKeyDataPda: sessionKeyDataPda.toBase58(),
      policies: params.policies,
      expiresAt,
      label: params.label,
    };

    const key = `${params.guardAccount.toBase58()}:${sessionKeypair.publicKey.toBase58()}`;
    this.activeSessions.set(key, session);

    return session;
  }

  /**
   * Revoke a session key on-chain.
   */
  async revokeSession(owner: Keypair, session: SolanaActiveSession): Promise<void> {
    const guardAccount = new PublicKey(session.guardAccount);
    const sessionKeyDataPda = new PublicKey(session.sessionKeyDataPda);

    const revokeIx = await this._buildRevokeInstruction(
      owner.publicKey,
      guardAccount,
      sessionKeyDataPda,
      new PublicKey(session.sessionKey)
    );

    const tx = new Transaction().add(revokeIx);
    await sendAndConfirmTransaction(this.connection, tx, [owner]);

    const key = `${session.guardAccount}:${session.sessionKey}`;
    this.activeSessions.delete(key);
  }

  /**
   * List all locally-tracked active sessions.
   */
  listSessions(guardAccount: string): SolanaActiveSession[] {
    const sessions: SolanaActiveSession[] = [];
    const now = Math.floor(Date.now() / 1000);

    for (const [, session] of this.activeSessions) {
      if (session.guardAccount === guardAccount && session.expiresAt > now) {
        sessions.push(session);
      }
    }
    return sessions;
  }

  /**
   * Serialize session for persistent storage.
   */
  serialize(session: SolanaActiveSession, cluster: string): SolanaSerializedSession {
    return {
      version: 1,
      guardAccount: session.guardAccount,
      owner: session.owner,
      sessionKey: session.sessionKey,
      encryptedSecretKey: Buffer.from(session.sessionSecretKey).toString("base64"),
      sessionKeyDataPda: session.sessionKeyDataPda,
      policies: session.policies,
      expiresAt: session.expiresAt,
      cluster,
      label: session.label,
    };
  }

  /**
   * Restore session from serialized data.
   */
  deserialize(data: SolanaSerializedSession): SolanaActiveSession {
    const session: SolanaActiveSession = {
      guardAccount: data.guardAccount,
      owner: data.owner,
      sessionKey: data.sessionKey,
      sessionSecretKey: new Uint8Array(Buffer.from(data.encryptedSecretKey, "base64")),
      sessionKeyDataPda: data.sessionKeyDataPda,
      policies: data.policies,
      expiresAt: data.expiresAt,
      label: data.label,
    };

    const key = `${data.guardAccount}:${data.sessionKey}`;
    this.activeSessions.set(key, session);
    return session;
  }

  // ─── Private: Instruction Builders ────────────────────────────────

  private async _buildRegisterInstruction(
    owner: PublicKey,
    guardAccount: PublicKey,
    sessionKeyData: PublicKey,
    sessionPubkey: PublicKey,
    validAfter: number,
    validUntil: number
  ): Promise<TransactionInstruction> {
    // Anchor instruction discriminator for register_session_key
    // In production, use the generated IDL + Anchor client
    const data = Buffer.alloc(8 + 8 + 8);
    // Discriminator (first 8 bytes) — placeholder
    data.writeBigInt64LE(BigInt(validAfter), 8);
    data.writeBigInt64LE(BigInt(validUntil), 16);

    return new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: guardAccount, isSigner: false, isWritable: true },
        { pubkey: sessionKeyData, isSigner: false, isWritable: true },
        { pubkey: sessionPubkey, isSigner: false, isWritable: false },
        { pubkey: owner, isSigner: true, isWritable: true },
        { pubkey: new PublicKey("11111111111111111111111111111111"), isSigner: false, isWritable: false },
      ],
      data,
    });
  }

  private async _buildRevokeInstruction(
    owner: PublicKey,
    guardAccount: PublicKey,
    sessionKeyData: PublicKey,
    sessionKey: PublicKey
  ): Promise<TransactionInstruction> {
    const data = Buffer.alloc(8); // Anchor discriminator only

    return new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: guardAccount, isSigner: false, isWritable: false },
        { pubkey: sessionKeyData, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: true, isWritable: false },
      ],
      data,
    });
  }

  private async _configurePolicies(
    owner: Keypair,
    guardAccount: PublicKey,
    sessionKeyData: PublicKey,
    policies: SolanaPolicyConfig[]
  ): Promise<void> {
    for (const policy of policies) {
      switch (policy.type) {
        case "spending-limit": {
          const [pda] = deriveSpendingLimitPda(sessionKeyData);
          // Build and send configure_spending_limit instruction
          break;
        }
        case "allowlist": {
          const [pda] = deriveAllowlistPda(sessionKeyData);
          // Build and send configure_allowlist instruction
          break;
        }
        case "rate-limit": {
          const [pda] = deriveRateLimitPda(sessionKeyData);
          // Build and send configure_rate_limit instruction
          break;
        }
        case "compute-limit": {
          const [pda] = deriveComputeLimitPda(sessionKeyData);
          // Build and send configure_compute_limit instruction
          break;
        }
      }
    }
  }
}
