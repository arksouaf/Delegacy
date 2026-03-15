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
import type { TransactionResult } from "../types/transaction";
import { SolanaSessionKeyManager } from "./SolanaSessionKeyManager";
import { deriveGuardPda, deriveSessionPda } from "../utils/pda";

/** SessionGuard program ID */
const PROGRAM_ID = new PublicKey("SGrd1111111111111111111111111111111111111111");

export interface SolanaSessionGuardConfig {
  /** Solana cluster: "mainnet-beta", "devnet", or "testnet" */
  cluster: "mainnet-beta" | "devnet" | "testnet";
  /** RPC endpoint URL */
  rpcUrl: string;
  /** Optional: custom program ID (defaults to canonical deployment) */
  programId?: string;
}

/**
 * SolanaSessionGuardClient — Main SDK entry point for Solana
 *
 * Usage:
 * ```ts
 * const client = new SolanaSessionGuardClient({
 *   cluster: "devnet",
 *   rpcUrl: "https://api.devnet.solana.com",
 * });
 * const guardAccount = await client.initializeAccount(ownerKeypair);
 * const session = await client.createSession({ owner, guardAccount, policies: [...] });
 * await client.execute({ session, targetProgram, instructionData });
 * ```
 */
export class SolanaSessionGuardClient {
  readonly config: SolanaSessionGuardConfig;
  readonly connection: Connection;
  readonly sessionKeys: SolanaSessionKeyManager;

  constructor(config: SolanaSessionGuardConfig) {
    this.config = config;
    this.connection = new Connection(config.rpcUrl, "confirmed");
    this.sessionKeys = new SolanaSessionKeyManager(this.connection);
  }

  // ─── Account Management ────────────────────────────────────────────

  /**
   * Initialize a SessionGuard account for an owner.
   * @param owner The owner's keypair (master key)
   * @returns The guard account PDA address
   */
  async initializeAccount(owner: Keypair): Promise<string> {
    const [guardPda] = deriveGuardPda(owner.publicKey);

    const data = Buffer.alloc(8); // Anchor discriminator for initialize_account

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: guardPda, isSigner: false, isWritable: true },
        { pubkey: owner.publicKey, isSigner: true, isWritable: true },
        {
          pubkey: new PublicKey("11111111111111111111111111111111"),
          isSigner: false,
          isWritable: false,
        },
      ],
      data,
    });

    const tx = new Transaction().add(ix);
    await sendAndConfirmTransaction(this.connection, tx, [owner]);

    return guardPda.toBase58();
  }

  /**
   * Get the guard account PDA for an owner (doesn't require on-chain call).
   */
  getGuardAddress(owner: PublicKey): string {
    const [guardPda] = deriveGuardPda(owner);
    return guardPda.toBase58();
  }

  // ─── Session Key Management ────────────────────────────────────────

  /**
   * Create a new session key with policies.
   * Owner's keypair signs once to authorize this session.
   */
  async createSession(params: {
    owner: Keypair;
    guardAccount: string;
    policies: SolanaPolicyConfig[];
    ttlSeconds?: number;
    label?: string;
  }): Promise<SolanaActiveSession> {
    const ttl = params.ttlSeconds ?? 86_400;
    return this.sessionKeys.createSession({
      owner: params.owner,
      guardAccount: new PublicKey(params.guardAccount),
      policies: params.policies,
      ttlSeconds: ttl,
      label: params.label,
    });
  }

  /**
   * Revoke an active session key.
   */
  async revokeSession(
    owner: Keypair,
    session: SolanaActiveSession
  ): Promise<void> {
    return this.sessionKeys.revokeSession(owner, session);
  }

  /**
   * List all active sessions for a guard account.
   */
  listSessions(guardAccount: string): SolanaActiveSession[] {
    return this.sessionKeys.listSessions(guardAccount);
  }

  // ─── Execution (via session key) ───────────────────────────────────

  /**
   * Execute a CPI call using a session key — no master key needed.
   * The session key signs the transaction.
   */
  async execute(params: {
    session: SolanaActiveSession;
    targetProgram: string;
    instructionData: Buffer;
    accounts?: Array<{
      pubkey: string;
      isSigner: boolean;
      isWritable: boolean;
    }>;
  }): Promise<TransactionResult> {
    const sessionKeypair = Keypair.fromSecretKey(params.session.sessionSecretKey);
    const guardAccount = new PublicKey(params.session.guardAccount);
    const sessionKeyDataPda = new PublicKey(params.session.sessionKeyDataPda);
    const targetProgram = new PublicKey(params.session.guardAccount);

    // Build execute_via_session instruction
    const data = Buffer.concat([
      Buffer.alloc(8), // Anchor discriminator for execute_via_session
      params.instructionData,
    ]);

    const keys = [
      { pubkey: guardAccount, isSigner: false, isWritable: false },
      { pubkey: sessionKeyDataPda, isSigner: false, isWritable: true },
      { pubkey: sessionKeypair.publicKey, isSigner: true, isWritable: false },
      { pubkey: new PublicKey(params.targetProgram), isSigner: false, isWritable: false },
    ];

    // Add remaining accounts for CPI
    if (params.accounts) {
      for (const acc of params.accounts) {
        keys.push({
          pubkey: new PublicKey(acc.pubkey),
          isSigner: acc.isSigner,
          isWritable: acc.isWritable,
        });
      }
    }

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys,
      data,
    });

    const tx = new Transaction().add(ix);

    try {
      const signature = await sendAndConfirmTransaction(this.connection, tx, [
        sessionKeypair,
      ]);
      return { signature, confirmed: true };
    } catch (error) {
      return {
        signature: "",
        confirmed: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // ─── Serialization ────────────────────────────────────────────────

  /**
   * Serialize a session for storage (e.g., localStorage, secure DB).
   */
  serializeSession(session: SolanaActiveSession): SolanaSerializedSession {
    return this.sessionKeys.serialize(session, this.config.cluster);
  }

  /**
   * Restore a session from serialized form.
   */
  deserializeSession(data: SolanaSerializedSession): SolanaActiveSession {
    return this.sessionKeys.deserialize(data);
  }
}
