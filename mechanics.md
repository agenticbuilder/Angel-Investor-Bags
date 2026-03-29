# Mechanics

## Fee Inflow

Protocol fees are routed externally to the designated fee sink wallet:

```
D1gPeYYJP15ZZDVQwkWcUrpjus3E6xnirkTWTAqi3xrG
```

The mechanism by which fees arrive at this wallet is outside the scope of this engine. That routing is defined at the protocol or contract level. The engine's only assumption is that this wallet accumulates native token over time as fees flow in.

The wallet is public. Anyone can verify its balance and transaction history on-chain at any time.

---

## Trigger Conditions

A buyback cycle begins only when all of the following conditions are true simultaneously:

**Condition 1: Balance threshold met**

The fee wallet's native balance must be greater than or equal to `MIN_TRIGGER_BALANCE`. This prevents buybacks from executing on dust amounts that would produce no meaningful market effect and waste gas.

**Condition 2: Cooldown elapsed**

The time since the last buyback cycle must be greater than or equal to `BUYBACK_COOLDOWN_SEC`. This prevents the engine from executing multiple cycles in rapid succession even if the balance threshold remains met after a partial spend.

If either condition is not met, the engine logs the reason and skips the cycle. No execution occurs. The next evaluation happens at the next `CHECK_INTERVAL_SEC` tick.

---

## Buyback Decision Flow

```
tick
  |
  +-- fetch fee wallet balance
  |
  +-- balance < MIN_TRIGGER_BALANCE?
  |       yes --> skip, log "below threshold"
  |
  +-- time since last buyback < BUYBACK_COOLDOWN_SEC?
  |       yes --> skip, log "cooldown active, Xs remaining"
  |
  +-- calculate budget:
  |       raw = balance * BUYBACK_RATIO
  |       budget = min(raw, MAX_BUYBACK_SIZE)
  |
  +-- budget == 0?
  |       yes --> skip, log "zero budget"
  |
  +-- trancheSize = budget / BUYBACK_TRANCHE_COUNT
  |
  +-- trancheSize == 0?
  |       yes --> skip, log "tranche size too small"
  |
  +-- decision: execute
        budget, trancheSize, trancheCount passed to execution module
```

The strategy function is pure. It takes balance, state, and config. It returns a decision. It does not execute anything.

---

## Tranche Logic

Splitting buybacks into tranches serves two purposes:

1. **Reduced market impact.** A single large market order is more disruptive than multiple smaller orders spread over a short window. Tranching reduces slippage on larger buyback budgets.

2. **Partial failure tolerance.** If one tranche fails (RPC error, slippage exceeded, gas spike), the remaining tranches cancel cleanly rather than leaving the execution in an ambiguous partial state.

Each tranche is:
- equal in size: `budget / BUYBACK_TRANCHE_COUNT`
- submitted sequentially with a fixed inter-tranche delay
- independently validated for slippage before submission (when a real DEX adapter is present)

On tranche failure, the cycle ends. The cooldown resets from that point. The unspent portion of the budget remains in the fee wallet for the next cycle.

---

## Cooldown Logic

The cooldown exists to enforce operator discipline and prevent the engine from over-executing in periods of high fee inflow.

After any cycle where execution was attempted (success or failure), `lastBuybackAt` is updated to the current time. The next cycle cannot begin until `BUYBACK_COOLDOWN_SEC` seconds have elapsed.

This means:
- High fee inflow does not cause rapid-fire buybacks.
- Failed cycles still trigger the cooldown. A failed execution is still an execution attempt.
- The cooldown is evaluated at each polling tick, not on a separate timer.

Cooldown values should be set based on the expected fee accumulation rate. A cooldown that is too short will cause the engine to transact more frequently than the fee balance justifies. A cooldown that is too long will cause unnecessary fee accumulation before execution.

---

## Why This Model

The design intent is to remove operator discretion from routine buyback decisions. The operator sets the parameters once. The engine follows them. The only way to change behavior is to change the config, which should be version-controlled and publicly reviewable.

This reduces:
- the risk of emotional or reactive treasury decisions
- the surface area for insider manipulation
- the ambiguity about when and why buybacks happen

It increases:
- predictability for token holders
- auditability for on-chain observers
- accountability for operators
