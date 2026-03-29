import type { BotConfig } from "../types.js";

/**
 * Validates that the config has a non-empty fee wallet address.
 */
export function assertFeeWallet(config: BotConfig): void {
  if (!config.feeWallet || config.feeWallet.trim() === "") {
    throw new Error("FEE_WALLET is not configured.");
  }
}

/**
 * Validates that the config has a non-empty token address when not in dry-run.
 */
export function assertTokenAddress(config: BotConfig): void {
  if (!config.dryRun && (!config.tokenAddress || config.tokenAddress.trim() === "")) {
    throw new Error("TOKEN_ADDRESS is required in live mode.");
  }
}

/**
 * Validates that a private key is present when not in dry-run mode.
 */
export function assertPrivateKey(config: BotConfig): void {
  if (!config.dryRun && (!config.privateKey || config.privateKey.trim() === "")) {
    throw new Error("PRIVATE_KEY is required in live mode.");
  }
}

/**
 * Validates that the router address is present when in live execution mode.
 */
export function assertRouterAddress(config: BotConfig): void {
  if (!config.dryRun && (!config.routerAddress || config.routerAddress.trim() === "")) {
    throw new Error("ROUTER_ADDRESS is required in live mode.");
  }
}

/**
 * Run all startup guards. Throws on the first failure.
 */
export function runStartupGuards(config: BotConfig): void {
  assertFeeWallet(config);
  assertTokenAddress(config);
  assertPrivateKey(config);
  // Router is optional if dry-run; assertRouterAddress enforces it for live mode
  assertRouterAddress(config);
}
