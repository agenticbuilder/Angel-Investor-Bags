import { formatEther } from "ethers";
import { randomUUID } from "crypto";
import { getLogger } from "../logger.js";
import type {
  BotConfig,
  BuybackCycleResult,
  DexAdapter,
  StrategyDecision,
  TrancheResult,
} from "../types.js";

// Delay between tranche submissions in milliseconds
const INTER_TRANCHE_DELAY_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * executeBuyback
 *
 * Submits a buyback cycle based on the approved strategy decision.
 *
 * In dry-run mode, all execution is simulated. No on-chain transactions are sent.
 *
 * In live mode, each tranche is submitted through the provided DexAdapter.
 * If a tranche fails, the remaining tranches are cancelled for this cycle.
 *
 * The DexAdapter is an interface defined in types.ts. Concrete implementations
 * (e.g. Uniswap v3, Raydium) are Phase 3 integration points and are NOT included
 * in this repository. The adapter slot is ready; plug in your implementation.
 */
export async function executeBuyback(
  decision: Extract<StrategyDecision, { action: "execute" }>,
  config: BotConfig,
  adapter: DexAdapter | null,
  recipientAddress: string
): Promise<BuybackCycleResult> {
  const logger = getLogger();
  const cycleId = randomUUID().slice(0, 8);
  const startedAt = new Date();
  const trancheResults: TrancheResult[] = [];

  logger.info("Buyback cycle starting", {
    cycleId,
    budget: formatEther(decision.budget),
    trancheCount: decision.trancheCount,
    trancheSize: formatEther(decision.trancheSize),
    dryRun: config.dryRun,
  });

  for (let i = 0; i < decision.trancheCount; i++) {
    const trancheIndex = i + 1;

    logger.info(`Tranche ${trancheIndex}/${decision.trancheCount}`, {
      cycleId,
      amountIn: formatEther(decision.trancheSize),
    });

    if (config.dryRun) {
      // Dry-run: simulate success without submitting anything
      trancheResults.push({
        index: trancheIndex,
        success: true,
        amountIn: decision.trancheSize,
        txHash: `dry-run-${cycleId}-${trancheIndex}`,
        skipped: false,
      });
      logger.info(`Tranche ${trancheIndex} simulated (dry-run)`, { cycleId });
    } else if (!adapter) {
      // No adapter configured: skip with a clear warning
      trancheResults.push({
        index: trancheIndex,
        success: false,
        amountIn: decision.trancheSize,
        error: "No DEX adapter configured. Set DRY_RUN=true or provide a DexAdapter.",
        skipped: true,
      });
      logger.warn(`Tranche ${trancheIndex} skipped -- no adapter`, { cycleId });
      break;
    } else {
      // Live execution via DEX adapter
      try {
        const txHash = await adapter.buyExactIn({
          amountIn: decision.trancheSize,
          tokenOut: config.tokenAddress,
          maxSlippageBps: config.maxSlippageBps,
          recipient: recipientAddress,
        });

        trancheResults.push({
          index: trancheIndex,
          success: true,
          amountIn: decision.trancheSize,
          txHash,
          skipped: false,
        });

        logger.info(`Tranche ${trancheIndex} submitted`, { cycleId, txHash });
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        trancheResults.push({
          index: trancheIndex,
          success: false,
          amountIn: decision.trancheSize,
          error,
          skipped: false,
        });
        logger.error(`Tranche ${trancheIndex} failed -- aborting cycle`, { cycleId, error });
        break; // Cancel remaining tranches on failure
      }
    }

    // Pause between tranches to reduce market impact
    if (i < decision.trancheCount - 1) {
      await sleep(INTER_TRANCHE_DELAY_MS);
    }
  }

  const completedAt = new Date();
  const successCount = trancheResults.filter((t) => t.success).length;
  const failureCount = trancheResults.filter((t) => !t.success && !t.skipped).length;

  const result: BuybackCycleResult = {
    cycleId,
    startedAt,
    completedAt,
    totalBudget: decision.budget,
    trancheResults,
    successCount,
    failureCount,
    dryRun: config.dryRun,
  };

  logger.info("Buyback cycle complete", {
    cycleId,
    successCount,
    failureCount,
    dryRun: config.dryRun,
    durationMs: completedAt.getTime() - startedAt.getTime(),
  });

  return result;
}
