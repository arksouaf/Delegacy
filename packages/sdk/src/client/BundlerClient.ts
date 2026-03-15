import type { UserOperation, UserOperationReceipt } from "../types/userOperation";

/**
 * BundlerClient — Communicates with an ERC-4337 bundler
 *
 * Handles UserOperation submission, gas estimation, and receipt polling.
 */
export class BundlerClient {
  private bundlerUrl: string;

  constructor(bundlerUrl: string) {
    this.bundlerUrl = bundlerUrl;
  }

  /**
   * Submit a UserOperation to the bundler
   */
  async sendUserOperation(userOp: UserOperation): Promise<UserOperationReceipt> {
    const response = await this._rpc("eth_sendUserOperation", [
      this._serializeUserOp(userOp),
      this._getEntryPoint(),
    ]);

    const userOpHash = response.result as `0x${string}`;

    // Poll for receipt
    return this.waitForReceipt(userOpHash);
  }

  /**
   * Estimate gas for a UserOperation
   */
  async estimateGas(
    userOp: Partial<UserOperation>
  ): Promise<{ callGasLimit: bigint; verificationGasLimit: bigint; preVerificationGas: bigint }> {
    const response = await this._rpc("eth_estimateUserOperationGas", [
      userOp,
      this._getEntryPoint(),
    ]);

    const result = response.result as Record<string, string>;
    return {
      callGasLimit: BigInt(result.callGasLimit),
      verificationGasLimit: BigInt(result.verificationGasLimit),
      preVerificationGas: BigInt(result.preVerificationGas),
    };
  }

  /**
   * Poll for UserOperation receipt
   */
  async waitForReceipt(
    userOpHash: `0x${string}`,
    maxAttempts: number = 30,
    intervalMs: number = 2000
  ): Promise<UserOperationReceipt> {
    for (let i = 0; i < maxAttempts; i++) {
      const response = await this._rpc("eth_getUserOperationReceipt", [userOpHash]);

      if (response.result) {
        const r = response.result as Record<string, unknown>;
        return {
          userOpHash,
          transactionHash: r.receipt
            ? (r.receipt as Record<string, string>).transactionHash as `0x${string}`
            : ("0x" as `0x${string}`),
          success: r.success as boolean,
          reason: r.reason as string | undefined,
          actualGasCost: BigInt((r.actualGasCost as string) ?? "0"),
          actualGasUsed: BigInt((r.actualGasUsed as string) ?? "0"),
        };
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error(`UserOperation ${userOpHash} not mined after ${maxAttempts} attempts`);
  }

  // ─── Private ──────────────────────────────────────────────────────

  private async _rpc(method: string, params: unknown[]): Promise<{ result: unknown }> {
    const res = await fetch(this.bundlerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method,
        params,
      }),
    });

    if (!res.ok) {
      throw new Error(`Bundler RPC error: ${res.status} ${res.statusText}`);
    }

    const json = (await res.json()) as { result?: unknown; error?: { message: string } };

    if (json.error) {
      throw new Error(`Bundler error: ${json.error.message}`);
    }

    return { result: json.result };
  }

  private _serializeUserOp(userOp: UserOperation): Record<string, string> {
    return {
      sender: userOp.sender,
      nonce: `0x${userOp.nonce.toString(16)}`,
      initCode: userOp.initCode,
      callData: userOp.callData,
      callGasLimit: `0x${userOp.callGasLimit.toString(16)}`,
      verificationGasLimit: `0x${userOp.verificationGasLimit.toString(16)}`,
      preVerificationGas: `0x${userOp.preVerificationGas.toString(16)}`,
      maxFeePerGas: `0x${userOp.maxFeePerGas.toString(16)}`,
      maxPriorityFeePerGas: `0x${userOp.maxPriorityFeePerGas.toString(16)}`,
      paymasterAndData: userOp.paymasterAndData,
      signature: userOp.signature,
    };
  }

  private _getEntryPoint(): string {
    // ERC-4337 v0.6 canonical EntryPoint
    return "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
  }
}
