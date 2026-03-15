/**
 * SessionGuard Solana — Enterprise Delegated Wallet Example
 *
 * Treasury manager controls the master key (hardware wallet / multisig).
 * Employees get role-based session keys with strict budgets, time limits,
 * and program restrictions — all enforced on-chain by Solana's runtime.
 */

import {
  SolanaSessionGuardClient,
  AllowlistPolicy,
  SpendingLimitPolicy,
  RateLimitPolicy,
  type SolanaActiveSession,
} from "@sessionguard/solana-sdk";
import { Keypair } from "@solana/web3.js";

// ── Program IDs ────────────────────────────────────────────────
const PAYROLL_PROGRAM = "Payroll1111111111111111111111111111111111111";
const VENDOR_PAY_PROGRAM = "VendorPay111111111111111111111111111111111";
const EXPENSE_PROGRAM = "Expense11111111111111111111111111111111111";

const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

// ── Initialize Client ──────────────────────────────────────────
const client = new SolanaSessionGuardClient({
  cluster: "mainnet-beta",
  rpcUrl: "https://api.mainnet-beta.solana.com",
});

/**
 * Create role-based session keys for corporate treasury management.
 */
export async function setupCorporateRoles(
  treasuryKeypair: Keypair,
  guardAccount: string
) {
  // ── Finance Manager: payroll + vendor payments ────────────
  const financeSession = await client.createSession({
    owner: treasuryKeypair,
    guardAccount,
    label: "Finance Manager — Monthly Operations",
    ttlSeconds: 30 * 24 * 60 * 60, // 30 days
    policies: [
      AllowlistPolicy({
        allowedPrograms: [PAYROLL_PROGRAM, VENDOR_PAY_PROGRAM],
      }),
      SpendingLimitPolicy({
        maxAmount: 500_000_000_000n, // $500K USDC
        tokenMint: USDC_MINT,
      }),
      RateLimitPolicy({ maxOps: 100, windowSeconds: 24 * 60 * 60 }), // 100 txs/day
    ],
  });

  // ── Team Lead: approve expenses up to $5K ─────────────────
  const teamLeadSession = await client.createSession({
    owner: treasuryKeypair,
    guardAccount,
    label: "Team Lead — Expense Approvals",
    ttlSeconds: 7 * 24 * 60 * 60, // 7 days
    policies: [
      AllowlistPolicy({
        allowedPrograms: [EXPENSE_PROGRAM],
      }),
      SpendingLimitPolicy({
        maxAmount: 5_000_000_000n, // $5K USDC
        tokenMint: USDC_MINT,
      }),
    ],
  });

  // ── Employee: submit expenses up to $200 ──────────────────
  const employeeSession = await client.createSession({
    owner: treasuryKeypair,
    guardAccount,
    label: "Employee — Expense Claims",
    ttlSeconds: 8 * 60 * 60, // 8 hours (one work day)
    policies: [
      AllowlistPolicy({
        allowedPrograms: [EXPENSE_PROGRAM],
      }),
      SpendingLimitPolicy({
        maxAmount: 200_000_000n, // $200 USDC
        tokenMint: USDC_MINT,
      }),
      RateLimitPolicy({ maxOps: 5, windowSeconds: 8 * 60 * 60 }), // 5 claims/day
    ],
  });

  return { financeSession, teamLeadSession, employeeSession };
}

/**
 * Emergency: Treasury manager revokes all active sessions
 */
export async function emergencyRevoke(
  treasuryKeypair: Keypair,
  sessions: SolanaActiveSession[]
) {
  for (const session of sessions) {
    await client.revokeSession(treasuryKeypair, session);
    console.log(`🚨 Revoked: ${session.label}`);
  }
  console.log(`🔒 All ${sessions.length} Solana sessions revoked.`);
}
