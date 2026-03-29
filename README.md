<div align="center">

# ANGELIC INVESTOR

<p align="center">
  <img src="./AI bg b.png" alt="Angel Investor" width="600"/>
</p>

### angelic-buyback-engine

*A transparent, config-driven buyback bot for protocol fee recycling.*

</div>

---

```
FEES  -->  TREASURY WALLET  -->  STRATEGY CHECK  -->  BUYBACK EXECUTION  -->  MARKET SUPPORT
  |               |                     |                      |                      |
inflow       monitored            threshold +             tranche split           price floor
routing      publicly              cooldown                 slippage                support
             visible               evaluated                guarded
```

---

## Project Thesis

Angelic Investor is a buyback engine. Protocol fees flow into a designated treasury wallet. A configurable bot watches that wallet, evaluates preset conditions, and executes buybacks on behalf of the protocol when those conditions are met. No discretion. No hidden allocation. No opaque treasury management. The logic is public. The wallet is public. The conditions are defined in a config file anyone can read.

The counterforce to demon meta energy is not preaching. It is buying.

---

## Why This Exists

Most protocol treasuries are a black box. Fees come in. Something happens. Holders are told to trust the team.

Angelic Investor is the opposite model. Every decision point in the buyback path is documented, configurable, and inspectable. The wallet address is public. The trigger thresholds are public. The execution logic is in this repository.

This is not a claim about returns or token price. It is a claim about legibility. Transparent mechanics are a form of trust that does not require trust.

---

## How It Works

1. Protocol fees are routed to the fee sink wallet at a known public address.
2. The bot monitors that wallet at a configurable interval.
3. When the wallet balance exceeds a minimum trigger threshold, and the cooldown period has elapsed, the strategy module evaluates whether to execute.
4. If the strategy approves, the execution module splits the buyback into tranches and submits them sequentially with slippage protection.
5. All decisions are logged. Dry-run mode allows full simulation without any on-chain action.

---

## Fee Flow

```
Protocol Activity
      |
      v
Fee Sink Wallet: D1gPeYYJP15ZZDVQwkWcUrpjus3E6xnirkTWTAqi3xrG
      |
      v
feeWatcher.ts  (monitors balance on interval)
      |
      v
buybackStrategy.ts  (evaluates trigger conditions)
      |
      +-- conditions not met --> skip, log, wait
      |
      +-- conditions met -------> executeBuyback.ts
                                        |
                                        v
                                  tranche 1 of N
                                  tranche 2 of N
                                  tranche N of N
                                        |
                                        v
                                  market buy executed
                                  token accumulation
```

---

## Fee Wallet

The designated fee sink and buyback funding wallet is:

```
D1gPeYYJP15ZZDVQwkWcUrpjus3E6xnirkTWTAqi3xrG
```

This address is the single point of entry for all protocol fee accumulation. It is publicly visible on-chain. The bot holds no authority to move funds except through the buyback execution path defined in this repository. Operators should treat this address as the canonical treasury reference.

---

## Buyback Logic

Buybacks are governed entirely by the values in `.env` and `src/config.ts`. No runtime decisions are made outside of what those parameters define.

| Parameter | Purpose | Example |
|---|---|---|
| `MIN_TRIGGER_BALANCE` | Minimum wallet balance before a buyback is considered | `0.5` (in native token) |
| `MAX_BUYBACK_SIZE` | Maximum total value spent in a single buyback cycle | `0.2` |
| `BUYBACK_COOLDOWN_SEC` | Seconds that must pass between buyback executions | `3600` |
| `CHECK_INTERVAL_SEC` | How often the bot polls the fee wallet | `60` |
| `BUYBACK_TRANCHE_COUNT` | Number of splits per buyback cycle | `3` |
| `MAX_SLIPPAGE_BPS` | Maximum acceptable slippage in basis points | `100` |

When conditions are met:

1. The total buyback budget is calculated as `min(balance * BUYBACK_RATIO, MAX_BUYBACK_SIZE)`.
2. The budget is divided into `BUYBACK_TRANCHE_COUNT` equal parts.
3. Each tranche is submitted sequentially with a short delay.
4. Slippage is checked against `MAX_SLIPPAGE_BPS` before each execution.
5. On failure or exceeded slippage, the remaining tranches are cancelled for that cycle and the cooldown resets.

---

## Design Principles

**Buybacks should be explainable.** If you cannot describe exactly when and why a buyback happens, the system is not well designed.

**Treasury behavior should be legible.** On-chain observers, token holders, and protocol contributors should be able to verify that the bot is doing what it says it is doing by reading the config and watching the public wallet.

**Bots should be bounded by rules.** No discretion. No manual overrides during normal operation. The bot follows the config. Changes to behavior require changes to config, which should be version-controlled and publicly reviewable.

**Transparent mechanics compound over time.** Meme projects that explain their mechanics clearly build a different kind of credibility than those that rely on hype. This repository is that credibility infrastructure.

---

## Architecture

```
src/
  config.ts           -- loads and validates all environment variables
  types.ts            -- shared TypeScript interfaces
  logger.ts           -- structured logging utility
  wallets.ts          -- wallet balance and transfer utilities
  index.ts            -- main runtime loop

  monitor/
    feeWatcher.ts     -- polls the fee wallet, emits balance events

  strategy/
    buybackStrategy.ts  -- evaluates trigger conditions, returns decision

  execution/
    executeBuyback.ts   -- submits buyback tranches to DEX adapter

  utils/
    format.ts         -- formatting helpers for balances and amounts
    guards.ts         -- runtime safety checks and type guards
```

The runtime loop in `index.ts` orchestrates the other modules. The watcher feeds balance data to the strategy. The strategy returns a typed decision. The execution module acts on that decision or skips cleanly.

DEX integration is marked as a scaffold in `executeBuyback.ts`. The adapter interface is defined but the concrete implementation is left as an integration point. This is intentional. The architecture is ready for a real DEX adapter. The default behavior is dry-run simulation.

See `docs/architecture.md` for a full module breakdown.

---

## Wallets

| Wallet | Role | Visibility |
|---|---|---|
| `D1gPeYYJP15ZZDVQwkWcUrpjus3E6xnirkTWTAqi3xrG` | Fee sink / buyback funding | Public |
| Operator wallet (via `PRIVATE_KEY`) | Transaction signer | Private, hot |

The fee wallet is read-only from the bot's perspective as a monitoring target. The operator wallet is the signer used to submit buyback transactions. These are two distinct roles. The fee wallet should never hold the operator private key.

---

## Safety and Trust Assumptions

This system is transparent, not trustless. There is a meaningful difference.

**Transparent** means: the wallet is public, the logic is in this repo, the config parameters are documented, and anyone can verify the bot's behavior by reading this code and watching the fee wallet on-chain.

**Not trustless** means: the operator controls the `PRIVATE_KEY`. The operator can change the config. The bot is a centralized process running on operator infrastructure. There is no on-chain enforcement of the strategy rules.

This is an honest position. The claim is not "this cannot be manipulated." The claim is "here is exactly how it works, and here is everything you need to verify it."

See `docs/risk-model.md` for a detailed breakdown of execution, slippage, key management, and operational risks.

---

## Repo Layout

```
angelic-buyback-engine/
  README.md
  package.json
  tsconfig.json
  .env.example
  .gitignore
  LICENSE

  docs/
    architecture.md
    mechanics.md
    deployment.md
    risk-model.md
    roadmap.md

  src/
    index.ts
    config.ts
    types.ts
    logger.ts
    wallets.ts
    monitor/
      feeWatcher.ts
    strategy/
      buybackStrategy.ts
    execution/
      executeBuyback.ts
    utils/
      format.ts
      guards.ts

  scripts/
    check-balance.ts
    simulate-buyback.ts
```

---

## Quick Start

```bash
git clone https://github.com/yourhandle/angelic-buyback-engine
cd angelic-buyback-engine
npm install
cp .env.example .env
# edit .env with your RPC_URL and config values
npm run dev
```

To run in dry-run mode (no on-chain execution):

```bash
DRY_RUN=true npm run dev
```

To check the fee wallet balance:

```bash
npm run check:balance
```

To simulate a full buyback cycle without execution:

```bash
npm run sim:buyback
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `RPC_URL` | Yes | JSON-RPC endpoint for your target chain |
| `PRIVATE_KEY` | Yes | Operator wallet private key (transaction signer) |
| `FEE_WALLET` | Yes | Fee sink address (default: `D1gPeYYJP15ZZDVQwkWcUrpjus3E6xnirkTWTAqi3xrG`) |
| `TOKEN_ADDRESS` | Yes | Contract address of the token to buy back |
| `MIN_TRIGGER_BALANCE` | Yes | Minimum native balance to trigger a buyback |
| `MAX_BUYBACK_SIZE` | Yes | Maximum native spend per buyback cycle |
| `BUYBACK_COOLDOWN_SEC` | Yes | Cooldown in seconds between cycles |
| `CHECK_INTERVAL_SEC` | Yes | Wallet polling interval in seconds |
| `BUYBACK_TRANCHE_COUNT` | Yes | Number of tranches per cycle |
| `MAX_SLIPPAGE_BPS` | Yes | Max slippage in basis points |
| `BUYBACK_RATIO` | No | Fraction of balance to spend (default: `0.8`) |
| `DRY_RUN` | No | If `true`, simulate without execution (default: `false`) |
| `LOG_LEVEL` | No | Logging verbosity: `info`, `debug`, `warn` (default: `info`) |

Never commit your `.env` file. Use a secrets manager in production. See `docs/deployment.md`.

---

## Future Extensions

| Extension | Status |
|---|---|
| Concrete DEX adapter (Uniswap v3, Raydium, etc.) | Planned, Phase 3 |
| On-chain telemetry / buyback event log | Planned, Phase 4 |
| Multi-wallet policy engine | Planned, Phase 5 |
| Web dashboard for fee wallet monitoring | Exploratory |
| Configurable strategy plugins | Exploratory |
| Multi-token buyback routing | Exploratory |

See `docs/roadmap.md` for phased delivery plan.

---

## Disclaimer

This repository is infrastructure code for a fee recycling mechanism. It is not financial advice. It makes no promises about token price, returns, or yield. The buyback mechanics described here are operational tooling, not investment strategy. Use this code at your own risk. Operators are responsible for key management, RPC reliability, and the consequences of their own configuration choices.

---

<div align="center">

*Angelic Investor. Transparent accumulation. Disciplined execution. Public mechanics.*

</div>
