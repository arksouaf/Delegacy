/**
 * SessionGuard Solana — IoT & Machine Economy Example
 *
 * Demonstrates autonomous device transactions on Solana:
 * fleet vehicles, EV chargers, supply chain sensors.
 *
 * Solana's high throughput (65k TPS) and low fees (<$0.001)
 * make it ideal for high-frequency machine-to-machine payments.
 */

import {
  SolanaSessionGuardClient,
  AllowlistPolicy,
  SpendingLimitPolicy,
  RateLimitPolicy,
  ComputeLimitPolicy,
  type SolanaActiveSession,
} from "@sessionguard/solana-sdk";
import { Keypair } from "@solana/web3.js";

// ── Program IDs ────────────────────────────────────────────────
const TOLL_PROGRAM = "TollPrg11111111111111111111111111111111111111";
const CHARGING_PROGRAM = "ChrgPrg11111111111111111111111111111111111";
const TELEMETRY_PROGRAM = "TlmtPrg11111111111111111111111111111111111";

// ── Initialize Client ──────────────────────────────────────────
const client = new SolanaSessionGuardClient({
  cluster: "mainnet-beta",
  rpcUrl: "https://api.mainnet-beta.solana.com",
});

/**
 * Provision a daily session key for a fleet vehicle.
 * Called by the fleet management system each morning.
 */
export async function provisionVehicleSession(
  fleetManagerKeypair: Keypair,
  guardAccount: string,
  vehicleId: string
): Promise<SolanaActiveSession> {
  const session = await client.createSession({
    owner: fleetManagerKeypair,
    guardAccount,
    label: `Vehicle ${vehicleId} — Daily Key`,
    ttlSeconds: 24 * 60 * 60, // 24-hour rotation
    policies: [
      AllowlistPolicy({
        allowedPrograms: [TOLL_PROGRAM, CHARGING_PROGRAM, TELEMETRY_PROGRAM],
      }),
      // $50/day budget per vehicle
      SpendingLimitPolicy({ maxAmount: 50_000_000_000n }), // 50 SOL
      // 500 operations per day
      RateLimitPolicy({ maxOps: 500, windowSeconds: 24 * 60 * 60 }),
      // Compute budget to prevent runaway CPI chains
      ComputeLimitPolicy({ maxComputeUnits: 100_000_000n }),
    ],
  });

  console.log(`🚗 Session provisioned for vehicle ${vehicleId}`);
  console.log(`   Budget: 50 SOL/day | 500 ops/day | 24h TTL`);
  return session;
}

/**
 * Vehicle pays a toll automatically
 */
export async function payToll(
  session: SolanaActiveSession,
  tollStationId: number,
  amountLamports: bigint
) {
  const data = Buffer.alloc(12);
  data.writeUInt32LE(tollStationId, 0);
  data.writeBigUInt64LE(amountLamports, 4);

  const result = await client.execute({
    session,
    targetProgram: TOLL_PROGRAM,
    instructionData: data,
  });

  console.log(`🛣️ Toll paid: station #${tollStationId} — sig: ${result.signature}`);
  return result;
}

/**
 * Vehicle pays for EV charging
 */
export async function payForCharging(
  session: SolanaActiveSession,
  chargerId: number,
  kwhAmount: number
) {
  const data = Buffer.alloc(8);
  data.writeUInt32LE(chargerId, 0);
  data.writeUInt32LE(kwhAmount, 4);

  const result = await client.execute({
    session,
    targetProgram: CHARGING_PROGRAM,
    instructionData: data,
  });

  console.log(`⚡ Charging paid: ${kwhAmount} kWh at charger #${chargerId}`);
  return result;
}

/**
 * Submit telemetry data on-chain (immutable audit trail)
 */
export async function submitTelemetry(
  session: SolanaActiveSession,
  sensorData: Buffer
) {
  const result = await client.execute({
    session,
    targetProgram: TELEMETRY_PROGRAM,
    instructionData: sensorData,
  });

  console.log(`📡 Telemetry submitted — sig: ${result.signature}`);
  return result;
}

/**
 * End of day: fleet manager rotates all vehicle keys
 */
export async function rotateFleetKeys(
  fleetManagerKeypair: Keypair,
  sessions: SolanaActiveSession[]
) {
  for (const session of sessions) {
    await client.revokeSession(fleetManagerKeypair, session);
    console.log(`🔄 Rotated: ${session.label}`);
  }
  console.log(`✅ All ${sessions.length} vehicle sessions rotated.`);
}
