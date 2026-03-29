import "dotenv/config";
import { parseEther } from "ethers";
import type { BotConfig } from "./types.js";

// Canonical fee wallet. Referenced throughout the system.
export const CANONICAL_FEE_WALLET = "D1gPeYYJP15ZZDVQwkWcUrpjus3E6xnirkTWTAqi3xrG";

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value.trim();
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key]?.trim() || fallback;
}

function parseFloatEnv(key: string, fallback?: number): number {
  const raw = process.env[key];
  if (!raw) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required environment variable: ${key}`);
  }
  const parsed = parseFloat(raw);
  if (isNaN(parsed)) throw new Error(`Invalid numeric value for ${key}: "${raw}"`);
  return parsed;
}

function parseIntEnv(key: string, fallback?: number): number {
  const raw = process.env[key];
  if (!raw) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required environment variable: ${key}`);
  }
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed)) throw new Error(`Invalid integer value for ${key}: "${raw}"`);
  return parsed;
}

export function loadConfig(): BotConfig {
  const minTrigger = parseFloatEnv("MIN_TRIGGER_BALANCE");
  const maxBuyback = parseFloatEnv("MAX_BUYBACK_SIZE");
  const buybackRatio = parseFloatEnv("BUYBACK_RATIO", 0.8);

  if (buybackRatio <= 0 || buybackRatio > 1) {
    throw new Error(`BUYBACK_RATIO must be between 0 (exclusive) and 1 (inclusive). Got: ${buybackRatio}`);
  }

  if (maxBuyback <= 0) {
    throw new Error(`MAX_BUYBACK_SIZE must be greater than 0. Got: ${maxBuyback}`);
  }

  const trancheCount = parseIntEnv("BUYBACK_TRANCHE_COUNT", 3);
  if (trancheCount < 1) {
    throw new Error(`BUYBACK_TRANCHE_COUNT must be at least 1. Got: ${trancheCount}`);
  }

  const maxSlippageBps = parseIntEnv("MAX_SLIPPAGE_BPS", 100);
  if (maxSlippageBps < 0 || maxSlippageBps > 10000) {
    throw new Error(`MAX_SLIPPAGE_BPS must be between 0 and 10000. Got: ${maxSlippageBps}`);
  }

  return {
    rpcUrl: requireEnv("RPC_URL"),
    chainId: parseIntEnv("CHAIN_ID", 1),
    privateKey: requireEnv("PRIVATE_KEY"),
    feeWallet: optionalEnv("FEE_WALLET", CANONICAL_FEE_WALLET),
    tokenAddress: requireEnv("TOKEN_ADDRESS"),
    routerAddress: optionalEnv("ROUTER_ADDRESS", ""),
    minTriggerBalance: parseEther(String(minTrigger)),
    maxBuybackSize: parseEther(String(maxBuyback)),
    buybackRatio,
    cooldownSec: parseIntEnv("BUYBACK_COOLDOWN_SEC", 3600),
    checkIntervalSec: parseIntEnv("CHECK_INTERVAL_SEC", 60),
    trancheCount,
    maxSlippageBps,
    dryRun: optionalEnv("DRY_RUN", "false") === "true",
    logLevel: optionalEnv("LOG_LEVEL", "info"),
  };
}
