import { formatEther, formatUnits } from "ethers";

/**
 * Format a bigint wei value as a human-readable ether string with fixed decimals.
 */
export function formatNative(wei: bigint, decimals: number = 6): string {
  const full = formatEther(wei);
  const num = parseFloat(full);
  return num.toFixed(decimals);
}

/**
 * Format a bigint token amount with a given decimal count.
 */
export function formatToken(amount: bigint, decimals: number = 18, displayDecimals: number = 4): string {
  const full = formatUnits(amount, decimals);
  const num = parseFloat(full);
  return num.toFixed(displayDecimals);
}

/**
 * Truncate an address to the standard short format: 0x1234...abcd
 */
export function shortAddress(address: string): string {
  if (address.length < 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format a duration in seconds to a readable string.
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

/**
 * Format basis points as a percentage string.
 */
export function formatBps(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}
