import { JsonRpcProvider } from "ethers";
import { getWalletBalance } from "../wallets.js";
import { getLogger } from "../logger.js";
import type { WalletBalance } from "../types.js";

export type BalanceHandler = (balance: WalletBalance) => Promise<void>;

interface WatcherOptions {
  provider: JsonRpcProvider;
  feeWallet: string;
  intervalSec: number;
  onBalance: BalanceHandler;
}

/**
 * feeWatcher
 *
 * Polls the fee sink wallet at a configurable interval and calls the
 * provided handler with the current balance on each tick.
 *
 * This module has no strategy logic. It observes and reports.
 */
export function startFeeWatcher(options: WatcherOptions): () => void {
  const { provider, feeWallet, intervalSec, onBalance } = options;
  const logger = getLogger();
  const intervalMs = intervalSec * 1000;

  logger.info("Fee watcher starting", {
    feeWallet,
    intervalSec,
  });

  let stopped = false;

  const tick = async () => {
    if (stopped) return;
    try {
      const balance = await getWalletBalance(provider, feeWallet);
      logger.debug("Fee wallet balance polled", {
        address: balance.address,
        balance: balance.nativeBalanceFormatted,
      });
      await onBalance(balance);
    } catch (err) {
      logger.warn("Fee watcher tick failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    if (!stopped) {
      setTimeout(tick, intervalMs);
    }
  };

  // Start first tick immediately
  setTimeout(tick, 0);

  return () => {
    stopped = true;
    logger.info("Fee watcher stopped");
  };
}
