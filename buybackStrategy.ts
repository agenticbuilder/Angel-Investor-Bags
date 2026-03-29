import { formatEther } from "ethers";
import type { BotConfig, RuntimeState, StrategyDecision, WalletBalance } from "../types.js";
import { getLogger } from "../logger.js";

/**
 * buybackStrategy
 *
 * Evaluates whether a buyback should execute given the current wallet balance,
 * runtime state, and configuration. Returns a typed decision with no side effects.
 *
 * This function is pure: it reads, evaluates, and returns. It does not execute.
 */
export function evaluateStrategy(
  balance: WalletBalance,
  state: RuntimeState,
  config: BotConfig
): StrategyDecision {
  const logger = getLogger();
  const now = new Date();

  // -- Threshold check -------------------------------------------
  if (balance.nativeBalance < config.minTriggerBalance) {
    const reason = `Balance ${formatEther(balance.nativeBalance)} below threshold ${formatEther(config.minTriggerBalance)}`;
    logger.info("Strategy: skip -- below threshold", { reason });
    return { action: "skip", reason };
  }

  // -- Cooldown check --------------------------------------------
  if (state.lastBuybackAt !== null) {
    const elapsedSec = (now.getTime() - state.lastBuybackAt.getTime()) / 1000;
    if (elapsedSec < config.cooldownSec) {
      const remainingSec = Math.ceil(config.cooldownSec - elapsedSec);
      const reason = `Cooldown active. ${remainingSec}s remaining`;
      logger.info("Strategy: skip -- cooldown active", { remainingSec });
      return { action: "skip", reason };
    }
  }

  // -- Budget calculation ----------------------------------------
  const rawBudget =
    (balance.nativeBalance * BigInt(Math.floor(config.buybackRatio * 10000))) / 10000n;

  const budget = rawBudget > config.maxBuybackSize ? config.maxBuybackSize : rawBudget;

  if (budget === 0n) {
    const reason = "Calculated budget is zero after ratio/cap application";
    logger.warn("Strategy: skip -- zero budget", { reason });
    return { action: "skip", reason };
  }

  const trancheSize = budget / BigInt(config.trancheCount);

  if (trancheSize === 0n) {
    const reason = `Budget ${formatEther(budget)} too small to split into ${config.trancheCount} tranches`;
    logger.warn("Strategy: skip -- tranche size too small", { reason });
    return { action: "skip", reason };
  }

  logger.info("Strategy: execute approved", {
    balance: formatEther(balance.nativeBalance),
    budget: formatEther(budget),
    trancheSize: formatEther(trancheSize),
    trancheCount: config.trancheCount,
  });

  return {
    action: "execute",
    budget,
    trancheSize,
    trancheCount: config.trancheCount,
  };
}
