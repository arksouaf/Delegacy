/**
 * SessionGuard — Enterprise Delegated Wallet Example
 *
 * CFO controls the master key. Employees get role-based session keys
 * with strict budgets, time limits, and contract restrictions.
 */

import {
  SessionGuardClient,
  AllowlistPolicy,
  SpendingLimitPolicy,
  RateLimitPolicy,
  type ActiveSession,
} from "@sessionguard/sdk";

const PAYROLL_CONTRACT = "0x6666666666666666666666666666666666666666" as const;
const VENDOR_PAY_CONTRACT = "0x7777777777777777777777777777777777777777" as const;
const EXPENSE_CONTRACT = "0x8888888888888888888888888888888888888888" as const;

const SELECTORS = {
  processPayroll: "0xaabb0001" as `0x${string}`,
  payVendor: "0xaabb0002" as `0x${string}`,
  claimExpense: "0xaabb0003" as `0x${string}`,
  approveExpense: "0xaabb0004" as `0x${string}`,
} as const;

const client = new SessionGuardClient({
  chainId: 1,
  rpcUrl: "https://eth-mainnet.g.alchemy.com/v2/demo",
  bundlerUrl: "https://bundler.sessionguard.io/mainnet",
});

/**
 * Create role-based session keys for corporate wallet management
 */
export async function setupCorporateRoles(treasuryAccount: `0x${string}`) {
  // ── Finance Manager: payroll + vendor payments ────────────
  const financeSession = await client.createSession({
    account: treasuryAccount,
    label: "Finance Manager — Monthly Operations",
    ttlSeconds: 30 * 24 * 60 * 60, // 30 days
    policies: [
      AllowlistPolicy({
        rules: [
          { target: PAYROLL_CONTRACT, selector: SELECTORS.processPayroll },
          { target: VENDOR_PAY_CONTRACT, selector: SELECTORS.payVendor },
        ],
      }),
      SpendingLimitPolicy({ maxAmount: 500_000_000_000n }), // $500K USDC
      RateLimitPolicy({ maxOps: 100, windowSeconds: 24 * 60 * 60 }), // 100 txs/day
    ],
  });

  // ── Team Lead: approve expenses up to $5K ─────────────────
  const teamLeadSession = await client.createSession({
    account: treasuryAccount,
    label: "Team Lead — Expense Approvals",
    ttlSeconds: 7 * 24 * 60 * 60, // 7 days
    policies: [
      AllowlistPolicy({
        rules: [{ target: EXPENSE_CONTRACT, selector: SELECTORS.approveExpense }],
      }),
      SpendingLimitPolicy({ maxAmount: 5_000_000_000n }), // $5K
    ],
  });

  // ── Employee: submit expenses up to $200 ──────────────────
  const employeeSession = await client.createSession({
    account: treasuryAccount,
    label: "Employee — Expense Claims",
    ttlSeconds: 8 * 60 * 60, // 8 hours (one work day)
    policies: [
      AllowlistPolicy({
        rules: [{ target: EXPENSE_CONTRACT, selector: SELECTORS.claimExpense }],
      }),
      SpendingLimitPolicy({ maxAmount: 200_000_000n }), // $200
      RateLimitPolicy({ maxOps: 5, windowSeconds: 8 * 60 * 60 }), // 5 claims/day
    ],
  });

  return { financeSession, teamLeadSession, employeeSession };
}

/**
 * Emergency: CFO revokes all active sessions
 */
export async function emergencyRevoke(
  treasuryAccount: `0x${string}`,
  sessions: ActiveSession[]
) {
  for (const session of sessions) {
    await client.revokeSession(treasuryAccount, session.sessionKey);
    console.log(`🚨 Revoked: ${session.label}`);
  }
  console.log(`🔒 All ${sessions.length} sessions revoked.`);
}
