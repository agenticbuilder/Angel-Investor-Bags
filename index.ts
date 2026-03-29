import { JsonRpcProvider, Wallet } from "ethers";
import { loadConfig, CANONICAL_FEE_WALLET } from "./config.js";
import { initLogger, getLogger } from "./logger.js";
import { startFeeWatcher } from "./monitor/feeWatcher.js";
import { evaluateStrategy } from "./strategy/buybackStrategy.js";
import { executeBuyback } from "./execution/executeBuyback.js";
import { runStartupGuards } from "./utils/guards.js";
import type { RuntimeState, WalletBalance } from "./types.js";

async function main() {
  const config = loadConfig();
  initLogger(config.logLevel);
  const logger = getLogger();

  logger.info("Angelic Buyback Engine starting");
  logger.info(`Fee wallet: ${CANONICAL_FEE_WALLET}`);
  logger.info(`Dry-run mode: ${config.dryRun}`);

  // Validate config before connecting
  runStartupGuards(config);

  const provider = new JsonRpcProvider(config.rpcUrl);
  const operatorWallet = new Wallet(config.privateKey, provider);

  logger.info(`Operator wallet: ${operatorWallet.address}`);

  // Runtime state: tracks cooldowns, cycle count, and total spend
  const state: RuntimeState = {
    lastBuybackAt: null,
    cycleCount: 0,
    totalSpent: 0n,
  };

  // Balance handler: called on every watcher tick
  const onBalance = async (balance: WalletBalance) => {
    logger.info("Balance check", {
      wallet: config.feeWallet,
      balance: balance.nativeBalanceFormatted,
    });

    const decision = evaluateStrategy(balance, state, config);

    if (decision.action === "skip") {
      logger.info("Skipping cycle", { reason: decision.reason });
      return;
    }

    // decision.action === "execute"
    const result = await executeBuyback(
      decision,
      config,
      null, // DEX adapter: null uses dry-run / scaffold path. Inject adapter here for live mode.
      operatorWallet.address
    );

    // Update runtime state on any execution attempt
    state.lastBuybackAt = new Date();
    state.cycleCount += 1;

    const spent = result.trancheResults
      .filter((t) => t.success)
      .reduce((sum, t) => sum + t.amountIn, 0n);

    state.totalSpent += spent;

    logger.info("Cycle complete", {
      cycleId: result.cycleId,
      cycleCount: state.cycleCount,
      successfulTranches: result.successCount,
      totalSpentAllTime: state.totalSpent.toString(),
    });
  };

  // Start the fee watcher
  const stopWatcher = startFeeWatcher({
    provider,
    feeWallet: config.feeWallet,
    intervalSec: config.checkIntervalSec,
    onBalance,
  });

  // Graceful shutdown
  process.on("SIGINT", () => {
    logger.info("Shutdown signal received");
    stopWatcher();
    logger.info("Angelic Buyback Engine stopped", {
      totalCycles: state.cycleCount,
      totalSpent: state.totalSpent.toString(),
    });
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    stopWatcher();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Fatal error:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
