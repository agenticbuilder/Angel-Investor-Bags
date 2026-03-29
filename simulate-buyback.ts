/**
 * scripts/simulate-buyback.ts
 *
 * Full dry-run simulation of a buyback cycle.
 * Forces DRY_RUN=true regardless of .env setting.
 * Useful for testing strategy logic and tranche math before going live.
 *
 * Usage: npm run sim:buyback
 */

import "dotenv/config";
import { JsonRpcProvider, parseEther } from "ethers";
import { loadConfig, CANONICAL_FEE_WALLET } from "../src/config.js";
import { initLogger, getLogger } from "../src/logger.js";
import { evaluateStrategy } from "../src/strategy/buybackStrategy.js";
import { executeBuyback } from "../src/execution/executeBuyback.js";
import { formatNative } from "../src/utils/format.js";
import type { RuntimeState, WalletBalance } from "../src/types.js";

async function main() {
  // Force dry-run
  process.env.DRY_RUN = "true";

  const config = loadConfig();
  initLogger(config.logLevel);
  const logger = getLogger();

  logger.info("Simulation mode: full dry-run buyback cycle");
  logger.info(`Fee wallet: ${config.feeWallet || CANONICAL_FEE_WALLET}`);

  // Simulate a balance above the trigger threshold
  const simulatedBalance = config.minTriggerBalance + parseEther("0.3");

  const mockWalletBalance: WalletBalance = {
    address: config.feeWallet || CANONICAL_FEE_WALLET,
    nativeBalance: simulatedBalance,
    nativeBalanceFormatted: formatNative(simulatedBalance),
    checkedAt: new Date(),
  };

  const mockState: RuntimeState = {
    lastBuybackAt: null,
    cycleCount: 0,
    totalSpent: 0n,
  };

  logger.info("Simulated fee wallet balance", {
    balance: mockWalletBalance.nativeBalanceFormatted,
    threshold: formatNative(config.minTriggerBalance),
  });

  // Evaluate strategy
  const decision = evaluateStrategy(mockWalletBalance, mockState, config);

  if (decision.action === "skip") {
    logger.info("Strategy returned skip -- check your MIN_TRIGGER_BALANCE and config", {
      reason: decision.reason,
    });
    return;
  }

  logger.info("Strategy approved execution", {
    budget: formatNative(decision.budget),
    trancheSize: formatNative(decision.trancheSize),
    trancheCount: decision.trancheCount,
  });

  // Execute in dry-run mode (no transactions submitted)
  const result = await executeBuyback(decision, config, null, "0xSimulatedRecipientAddress");

  logger.info("Simulation complete", {
    cycleId: result.cycleId,
    successCount: result.successCount,
    failureCount: result.failureCount,
    durationMs: result.completedAt.getTime() - result.startedAt.getTime(),
  });

  console.log("");
  console.log("  Simulation Results");
  console.log("  ------------------");
  result.trancheResults.forEach((t) => {
    const status = t.success ? "OK" : t.skipped ? "SKIPPED" : "FAILED";
    console.log(
      `  Tranche ${t.index}: ${status} | amount: ${formatNative(t.amountIn)} | txHash: ${t.txHash ?? t.error}`
    );
  });
  console.log("");
}

main().catch((err) => {
  console.error("Simulation error:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
