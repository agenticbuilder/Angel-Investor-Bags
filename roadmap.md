# Roadmap

The Angelic Buyback Engine is designed to grow in phases. Each phase adds capability without breaking the foundation of the previous one. The core principle at every phase is the same: the system should remain inspectable, config-driven, and honest about what it does.

---

## Phase 1: Public Mechanism Repo

**Status: Complete**

Deliverables:
- Full repository structure with documented architecture
- TypeScript source for monitor, strategy, execution, and utilities
- Config-driven design with `.env.example`
- Dry-run mode
- `check:balance` and `sim:buyback` scripts
- Complete documentation: architecture, mechanics, risk model, deployment, roadmap
- Public fee wallet referenced throughout: `D1gPeYYJP15ZZDVQwkWcUrpjus3E6xnirkTWTAqi3xrG`

This phase establishes the public record of how the system works. Anyone who wants to understand the buyback mechanics can read this repository.

---

## Phase 2: Persistent State and Dry-Run Watcher

**Status: Planned**

Deliverables:
- Write `lastBuybackAt` and `cycleCount` to a local state file (JSON) so state survives restarts
- Optional: simple SQLite store for cycle history
- Enhanced dry-run logging with projected execution summaries
- Configurable alert output (stdout structured JSON for log aggregators)
- Basic health check endpoint (HTTP) to confirm the bot is running

This phase makes the engine suitable for sustained deployment without requiring manual state recovery after restarts.

---

## Phase 3: DEX Adapter Integration

**Status: Planned**

Deliverables:
- Concrete `DexAdapter` implementation for at least one DEX
  - Candidate: Uniswap v3 (EVM chains)
  - Candidate: Raydium (Solana)
- Pre-execution quote validation using `quoteExactIn`
- Slippage enforcement wired to adapter output
- Gas estimation with configurable max gas price guard
- Integration tests in dry-run mode against a fork or devnet

This phase is when the engine goes from scaffolded to functional in live mode.

---

## Phase 4: On-Chain Telemetry and Dashboard

**Status: Planned**

Deliverables:
- Emit structured buyback events to a public data endpoint or on-chain log
- Simple read-only dashboard showing:
  - Fee wallet balance over time
  - Buyback cycles executed (count, dates, amounts)
  - Total native spent on buybacks
  - Next estimated buyback window based on current config
- Fee wallet history parsed from chain and displayed

This phase makes the transparency claim concrete and visible to non-technical holders. The mechanics are already public in this repo. The dashboard makes them legible at a glance.

---

## Phase 5: Multi-Wallet Policy Engine

**Status: Exploratory**

Deliverables:
- Support for multiple fee wallets with separate strategy configs per wallet
- Policy routing: different wallets can trigger different execution strategies
- Allocation weighting: distribute buyback budget across multiple strategies or pools
- Role separation: read-only monitor wallet vs. execution signer wallet enforced at the config level

This phase is for protocols that have more complex fee routing or want to run parallel buyback strategies across different chains or token pairs.

---

## Non-Goals

The following are explicitly out of scope for this engine, permanently:

- Yield generation or staking of treasury funds
- Leveraged or derivatives-based execution
- Discretionary manual execution outside the config rules
- Any mechanism that introduces hidden operator authority over fund allocation

The engine buys. It does not speculate, lend, or delegate.
