/**
 * Parse a human-readable duration string into seconds
 * Supports: "30s", "5m", "2h", "7d", "1w"
 */
export function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)(s|m|h|d|w)$/);
  if (!match) throw new Error(`Invalid duration: ${duration}`);

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3_600,
    d: 86_400,
    w: 604_800,
  };

  return value * multipliers[unit];
}

/**
 * Encode function selector from human-readable signature
 * e.g., "transfer(address,uint256)" → "0xa9059cbb"
 */
export function toFunctionSelector(signature: string): `0x${string}` {
  // Simple implementation — real version would use keccak256
  // This is a placeholder; use viem's toFunctionSelector in production
  const encoder = new TextEncoder();
  const data = encoder.encode(signature);
  let hash = 0;
  for (const byte of data) {
    hash = ((hash << 5) - hash + byte) | 0;
  }
  return `0x${Math.abs(hash).toString(16).padStart(8, "0").slice(0, 8)}` as `0x${string}`;
}
