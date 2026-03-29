import { BigNumberish } from "ethers";

// -- Core configuration shape ------------------------------------

export interface BotConfig {
  rpcUrl: string;
  chainId: number;
  privateKey: string;
  feeWallet: string;
  tokenAddress: string;
  routerAddress: string;
  minTriggerBalance: bigint;
  maxBuybackSize: bigint;
  buybackRatio: number;
  cooldownSec: number;
  checkIntervalSec: number;
  trancheCount: number;
  maxSlippageBps: number;
  dryRun: boolean;
  logLevel: string;
}

// -- Wallet state ------------------------------------------------

export interface WalletBalance {
  address: string;
  nativeBalance: bigint;
  nativeBalanceFormatted: string;
  checkedAt: Date;
}

// -- Strategy decision -------------------------------------------

export type StrategyDecision =
  | { action: "skip"; reason: string }
  | { action: "execute"; budget: bigint; trancheSize: bigint; trancheCount: number };

// -- Buyback execution -------------------------------------------

export interface TrancheParams {
  index: number;
  totalTranches: number;
  amountIn: bigint;
  tokenAddress: string;
  maxSlippageBps: number;
  dryRun: boolean;
}

export interface TrancheResult {
  index: number;
  success: boolean;
  amountIn: bigint;
  txHash?: string;
  error?: string;
  skipped: boolean;
}

export interface BuybackCycleResult {
  cycleId: string;
  startedAt: Date;
  completedAt: Date;
  totalBudget: bigint;
  trancheResults: TrancheResult[];
  successCount: number;
  failureCount: number;
  dryRun: boolean;
}

// -- Runtime state -----------------------------------------------

export interface RuntimeState {
  lastBuybackAt: Date | null;
  cycleCount: number;
  totalSpent: bigint;
}

// -- DEX adapter interface (Phase 3 integration point) -----------

export interface DexAdapter {
  /**
   * Execute a market buy for the given token using native currency.
   * Returns the transaction hash on success.
   * Throws on failure or exceeded slippage.
   */
  buyExactIn(params: {
    amountIn: BigNumberish;
    tokenOut: string;
    maxSlippageBps: number;
    recipient: string;
  }): Promise<string>;

  /**
   * Quote the expected output for a given native input amount.
   * Used for slippage pre-checks.
   */
  quoteExactIn(params: {
    amountIn: BigNumberish;
    tokenOut: string;
  }): Promise<bigint>;
}
