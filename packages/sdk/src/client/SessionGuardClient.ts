import type { SessionConfig, ActiveSession, SerializedSession } from "../types/session";
import type { PolicyConfig } from "../types/policy";
import type { UserOperation, UserOperationReceipt } from "../types/userOperation";
import { SessionKeyManager } from "./SessionKeyManager";
import { BundlerClient } from "./BundlerClient";

export interface SessionGuardClientConfig {
  /** Chain ID to operate on */
  chainId: number;
  /** RPC URL for the target chain */
  rpcUrl: string;
  /** Bundler endpoint URL */
  bundlerUrl: string;
  /** Paymaster endpoint URL (optional — for sponsored gas) */
  paymasterUrl?: string;
  /** SessionGuard contract addresses (auto-detected if not provided) */
  contracts?: {
    factory: `0x${string}`;
    validator: `0x${string}`;
    entryPoint: `0x${string}`;
    policies: {
      spendingLimit: `0x${string}`;
      allowlist: `0x${string}`;
      rateLimit: `0x${string}`;
      gasLimit: `0x${string}`;
    };
  };
}

/**
 * SessionGuardClient — Main SDK entry point
 *
 * Usage:
 * ```ts
 * const client = new SessionGuardClient({ chainId: 1, rpcUrl: '...', bundlerUrl: '...' });
 * const account = await client.createAccount({ owner: ownerSigner });
 * const session = await client.createSession({ account, policies: [...] });
 * await session.execute({ target, data });
 * ```
 */
export class SessionGuardClient {
  readonly config: SessionGuardClientConfig;
  readonly sessionKeys: SessionKeyManager;
  readonly bundler: BundlerClient;

  constructor(config: SessionGuardClientConfig) {
    this.config = config;
    this.sessionKeys = new SessionKeyManager(config);
    this.bundler = new BundlerClient(config.bundlerUrl);
  }

  // ─── Account Management ────────────────────────────────────────────

  /**
   * Deploy a new SessionGuard smart account
   * @param params.owner  The owner's address (master key)
   * @param params.salt   Optional salt for deterministic addresses
   * @returns The deployed account address
   */
  async createAccount(params: {
    owner: `0x${string}`;
    salt?: bigint;
  }): Promise<`0x${string}`> {
    const salt = params.salt ?? 0n;
    // Build the factory createAccount UserOp
    const initCode = this._encodeAccountCreation(params.owner, salt);
    const counterfactualAddress = await this.getAccountAddress(params.owner, salt);

    // Submit via bundler
    await this.bundler.sendUserOperation({
      sender: counterfactualAddress,
      nonce: 0n,
      initCode,
      callData: "0x" as `0x${string}`,
      callGasLimit: 500_000n,
      verificationGasLimit: 500_000n,
      preVerificationGas: 100_000n,
      maxFeePerGas: 1_000_000_000n,
      maxPriorityFeePerGas: 1_000_000_000n,
      paymasterAndData: "0x" as `0x${string}`,
      signature: "0x" as `0x${string}`,
    });

    return counterfactualAddress;
  }

  /**
   * Compute the counterfactual address of an account (before deployment)
   */
  async getAccountAddress(owner: `0x${string}`, salt: bigint = 0n): Promise<`0x${string}`> {
    // This would call the factory's getAccountAddress view function
    // Placeholder — real implementation uses viem contract read
    return `0x${"0".repeat(40)}` as `0x${string}`;
  }

  // ─── Session Key Management ────────────────────────────────────────

  /**
   * Create a new session key with policies
   * Master key signs once to authorize this session.
   */
  async createSession(params: {
    account: `0x${string}`;
    policies: PolicyConfig[];
    ttlSeconds?: number;
    label?: string;
  }): Promise<ActiveSession> {
    const ttl = params.ttlSeconds ?? 86_400; // 24h default
    return this.sessionKeys.createSession({
      account: params.account,
      policies: params.policies,
      ttlSeconds: ttl,
      label: params.label,
    });
  }

  /**
   * Revoke an active session key
   */
  async revokeSession(account: `0x${string}`, sessionKey: `0x${string}`): Promise<void> {
    return this.sessionKeys.revokeSession(account, sessionKey);
  }

  /**
   * List all active sessions for an account
   */
  async listSessions(account: `0x${string}`): Promise<ActiveSession[]> {
    return this.sessionKeys.listSessions(account);
  }

  // ─── Execution (via session key) ───────────────────────────────────

  /**
   * Execute a transaction using a session key — no master key needed
   */
  async execute(params: {
    session: ActiveSession;
    target: `0x${string}`;
    value?: bigint;
    data: `0x${string}`;
  }): Promise<UserOperationReceipt> {
    const userOp = await this._buildUserOp(params);
    return this.bundler.sendUserOperation(userOp);
  }

  /**
   * Execute a batch of transactions using a session key
   */
  async executeBatch(params: {
    session: ActiveSession;
    calls: Array<{
      target: `0x${string}`;
      value?: bigint;
      data: `0x${string}`;
    }>;
  }): Promise<UserOperationReceipt> {
    const userOp = await this._buildBatchUserOp(params);
    return this.bundler.sendUserOperation(userOp);
  }

  // ─── Serialization ────────────────────────────────────────────────

  /**
   * Serialize a session for storage (e.g., localStorage, secure DB)
   */
  serializeSession(session: ActiveSession): SerializedSession {
    return this.sessionKeys.serialize(session, this.config.chainId);
  }

  /**
   * Restore a session from serialized form
   */
  deserializeSession(data: SerializedSession): ActiveSession {
    return this.sessionKeys.deserialize(data);
  }

  // ─── Private ──────────────────────────────────────────────────────

  private _encodeAccountCreation(owner: `0x${string}`, salt: bigint): `0x${string}` {
    // Encodes factory address + createAccount(owner, salt) calldata
    // Real implementation uses viem's encodeFunctionData
    return "0x" as `0x${string}`;
  }

  private async _buildUserOp(params: {
    session: ActiveSession;
    target: `0x${string}`;
    value?: bigint;
    data: `0x${string}`;
  }): Promise<UserOperation> {
    return {
      sender: params.session.account,
      nonce: 0n, // Would fetch from EntryPoint
      initCode: "0x" as `0x${string}`,
      callData: params.data,
      callGasLimit: 200_000n,
      verificationGasLimit: 200_000n,
      preVerificationGas: 50_000n,
      maxFeePerGas: 1_000_000_000n,
      maxPriorityFeePerGas: 1_000_000_000n,
      paymasterAndData: "0x" as `0x${string}`,
      signature: "0x" as `0x${string}`, // Would sign with session key
    };
  }

  private async _buildBatchUserOp(params: {
    session: ActiveSession;
    calls: Array<{ target: `0x${string}`; value?: bigint; data: `0x${string}` }>;
  }): Promise<UserOperation> {
    return this._buildUserOp({
      session: params.session,
      target: params.session.account,
      data: "0x" as `0x${string}`, // Would encode executeBatch calldata
    });
  }
}
