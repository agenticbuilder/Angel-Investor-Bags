import { JsonRpcProvider, formatEther } from "ethers";
import type { WalletBalance } from "./types.js";
import { getLogger } from "./logger.js";

/**
 * Fetch the native token balance of a wallet address.
 */
export async function getWalletBalance(
  provider: JsonRpcProvider,
  address: string
): Promise<WalletBalance> {
  const logger = getLogger();
  logger.debug("Fetching balance", { address });

  const raw = await provider.getBalance(address);

  return {
    address,
    nativeBalance: raw,
    nativeBalanceFormatted: formatEther(raw),
    checkedAt: new Date(),
  };
}

/**
 * Returns true if the given address is a plausible hex EVM address.
 * Note: fee wallet is a Solana-style address and passes a separate check.
 */
export function isValidEvmAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
}

/**
 * Returns true if the address looks like a base58 Solana public key.
 * Used to validate the canonical fee wallet reference.
 */
export function isValidSolanaAddress(address: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}
