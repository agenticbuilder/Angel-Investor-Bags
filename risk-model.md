# Risk Model

This document describes the known risks of running the Angelic Buyback Engine. It does not argue that these risks are small. It describes them honestly so that operators can make informed decisions.

---

## Execution Risk

**What it is:** On-chain transactions can fail. Gas estimation may be wrong. Network congestion can cause timeouts. Transactions may drop from the mempool.

**How the engine handles it:** Each tranche is wrapped in a try-catch. Failure aborts the remaining tranches for that cycle. The cooldown resets. Funds remain in the fee wallet.

**What the engine does not handle:** Stuck transactions. Nonce gaps if a transaction is dropped mid-cycle. Gas price spikes that make execution economically unviable. Operators should monitor the operator wallet's nonce state and transaction history if running in live mode.

---

## Slippage Risk

**What it is:** Between the time the engine checks a quote and the time a transaction settles, the price can move. Large buybacks relative to pool liquidity can cause significant price impact.

**How the engine handles it:** `MAX_SLIPPAGE_BPS` sets an upper bound on acceptable slippage. When a real DEX adapter is present, the adapter is expected to encode this limit into the transaction (e.g. `amountOutMinimum` in Uniswap v3 terms). If slippage exceeds the limit, the transaction reverts on-chain.

**What the engine does not handle:** The `MAX_SLIPPAGE_BPS` parameter is only as good as the adapter's implementation of it. Operators are responsible for verifying that their DEX adapter correctly enforces slippage limits. The tranche split helps but does not eliminate slippage risk on illiquid pairs.

---

## Key Management Risk

**What it is:** The engine requires a `PRIVATE_KEY` for the operator wallet in live mode. This key signs transactions. If it is compromised, an attacker can drain the operator wallet, submit unauthorized transactions, or disrupt the buyback process.

**Mitigations:**
- Use a dedicated hot wallet for the operator key. Never use a personal, multisig, or main treasury key.
- Keep the operator wallet funded with only enough native token for gas. The buyback funds should remain in the fee wallet, which the engine reads but does not control directly.
- Use a secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.) rather than a plain `.env` file in production.
- Rotate the key if there is any reason to suspect exposure.

**What this engine cannot do:** Protect against a compromised host. If the machine running the bot is compromised, the private key is compromised.

---

## RPC Dependence

**What it is:** The engine depends entirely on a single JSON-RPC endpoint. If that endpoint is down, rate-limited, or returns incorrect data, the engine cannot function.

**How the engine handles it:** RPC errors on the balance fetch are caught and logged as warnings. The engine continues polling. It does not crash.

**What the engine does not handle:** Prolonged RPC outages. Incorrect balance data from a faulty node. Split-brain scenarios where the RPC is partially reachable. For production use, operators should use a reliable paid node provider and consider a fallback RPC.

---

## Operational Centralization

**What it is:** This engine is a centralized process. It runs on a machine controlled by an operator. The operator can stop it, change the config, or replace it with something else entirely. There is no on-chain enforcement of the strategy rules.

**The honest position:** This system is transparent, not trustless. The fee wallet is public. The code is public. The config parameters are documented. Anyone can observe the fee wallet and verify that buybacks are happening according to the stated schedule. But they cannot prevent the operator from changing that behavior.

This is the correct model for a v0 system. Building trustless, on-chain enforced buyback logic is significantly more complex and introduces its own attack surfaces. The current design prioritizes legibility and inspectability over trustlessness.

If trustlessness is a requirement, the path is: migrate the strategy and execution logic to a smart contract, use a price oracle, and remove the centralized operator key from the critical path.

---

## Summary Table

| Risk | Severity | Mitigated By |
|---|---|---|
| Transaction failure | Medium | Per-tranche catch, cooldown reset, funds stay in wallet |
| Slippage | Medium | `MAX_SLIPPAGE_BPS`, tranche splitting, adapter enforcement |
| Key compromise | High | Dedicated hot wallet, secrets manager, minimal gas balance |
| RPC outage | Medium | Warning + continue loop, reliable node provider |
| Operational centralization | Acknowledged | Public wallet, public code, config transparency |
| Misconfiguration | Low | Startup guards, typed config, `.env.example` |
