# Architecture

## Overview

The Angelic Buyback Engine is a modular, config-driven Node.js process. It has a clear separation between monitoring, strategy evaluation, execution, and configuration. Each layer has a single responsibility and communicates through typed interfaces.

The system does not use a message queue, database, or external state store. Runtime state is held in memory. This is intentional for v0: the system is simple enough that in-memory state is sufficient, and adding persistence complexity before it is needed would obscure the core logic.

---

## Module Map

```
src/
  index.ts                 Runtime loop. Orchestrates all other modules.
  config.ts                Loads and validates environment variables into BotConfig.
  types.ts                 All shared TypeScript interfaces and type definitions.
  logger.ts                Winston-based structured logger. Initialized once at startup.
  wallets.ts               Balance fetching and address validation utilities.

  monitor/
    feeWatcher.ts          Polls the fee wallet at a configurable interval.
                           Calls a handler with the WalletBalance on each tick.
                           Has no strategy logic. It observes only.

  strategy/
    buybackStrategy.ts     Pure function: evaluates WalletBalance + RuntimeState + BotConfig.
                           Returns a StrategyDecision (skip or execute).
                           Has no side effects. Does not call the network.

  execution/
    executeBuyback.ts      Accepts an approved StrategyDecision and executes it.
                           Splits budget into tranches. Submits each through the DexAdapter.
                           In dry-run mode, simulates all tranches without any network calls.

  utils/
    format.ts              Formatting helpers: balances, addresses, durations, basis points.
    guards.ts              Startup validation checks. Throws on misconfiguration.
```

---

## Runtime Loop

```
startup
  |
  +-- loadConfig()            read and validate .env
  +-- initLogger()            set up logging
  +-- runStartupGuards()      fail fast on bad config
  +-- new JsonRpcProvider()   connect to RPC
  +-- new Wallet()            initialize operator signer
  |
  v
startFeeWatcher()
  |
  every CHECK_INTERVAL_SEC:
    |
    +-- getWalletBalance()    fetch fee wallet native balance
    |
    +-- evaluateStrategy()    check threshold, cooldown, budget
    |       |
    |       +-- skip: log reason, wait for next tick
    |       |
    |       +-- execute:
    |               |
    |               v
    |           executeBuyback()
    |               |
    |               for each tranche:
    |                 +-- dryRun: simulate, log
    |                 +-- live: adapter.buyExactIn(), log tx hash
    |                 +-- failure: abort remaining tranches
    |               |
    |               v
    |           update RuntimeState
    |           log cycle result
    |
  wait for next tick
```

---

## Config Flow

All configuration enters through a single path:

```
.env file
  |
  v
loadConfig() in src/config.ts
  |
  v
BotConfig (typed interface in src/types.ts)
  |
  v
passed explicitly to every module that needs it
```

No module reads `process.env` directly except `config.ts`. This makes configuration testable, auditable, and easy to trace.

---

## DEX Adapter Integration Point

`executeBuyback.ts` accepts a `DexAdapter | null` parameter. The `DexAdapter` interface is defined in `src/types.ts`:

```typescript
interface DexAdapter {
  buyExactIn(params: {
    amountIn: BigNumberish;
    tokenOut: string;
    maxSlippageBps: number;
    recipient: string;
  }): Promise<string>;

  quoteExactIn(params: {
    amountIn: BigNumberish;
    tokenOut: string;
  }): Promise<bigint>;
}
```

To connect a real DEX:

1. Create `src/adapters/yourDex.ts` that implements `DexAdapter`.
2. Instantiate it in `src/index.ts` and pass it to `executeBuyback`.
3. The rest of the system does not change.

When `adapter` is `null` and `dryRun` is `false`, the engine logs a warning and skips execution. This is a safe fallback, not a silent failure.

---

## State Management

Runtime state is a single `RuntimeState` object defined in `src/types.ts`:

```typescript
interface RuntimeState {
  lastBuybackAt: Date | null;
  cycleCount: number;
  totalSpent: bigint;
}
```

This object is mutated in `src/index.ts` after each execution cycle. It is not persisted. On restart, the cooldown resets. This is an acceptable tradeoff for v0. Persistent state (e.g. writing last execution time to disk or a simple key-value store) is a straightforward Phase 2 addition.

---

## Error Handling Strategy

- Config errors: throw at startup via `runStartupGuards`. The process exits before entering the loop.
- RPC errors on balance fetch: caught in the watcher tick, logged as warnings, loop continues.
- Execution errors on a tranche: caught per-tranche, remaining tranches cancelled, cycle ends, cooldown resets.
- Unhandled errors in the main loop: propagate to the top-level catch in `index.ts` and exit with code 1.

The system prefers loud failure over silent degradation. If something is wrong, it should be visible in the logs immediately.
