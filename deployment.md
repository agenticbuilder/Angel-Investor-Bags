# Deployment

## Requirements

- Node.js 18 or higher
- npm 9 or higher
- A funded operator wallet (hot wallet, dedicated, not personal)
- A reliable JSON-RPC endpoint for your target chain
- Access to the fee wallet address for monitoring (read-only)

---

## Install

```bash
git clone https://github.com/yourhandle/angelic-buyback-engine
cd angelic-buyback-engine
npm install
```

---

## Configure

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Open `.env` and configure at minimum:

```
RPC_URL=https://your-rpc-endpoint
PRIVATE_KEY=0xyour_operator_wallet_private_key
TOKEN_ADDRESS=0xyour_token_contract_address
MIN_TRIGGER_BALANCE=0.5
MAX_BUYBACK_SIZE=0.2
BUYBACK_COOLDOWN_SEC=3600
CHECK_INTERVAL_SEC=60
BUYBACK_TRANCHE_COUNT=3
MAX_SLIPPAGE_BPS=100
```

The `FEE_WALLET` defaults to the canonical Angelic Investor fee wallet:
`D1gPeYYJP15ZZDVQwkWcUrpjus3E6xnirkTWTAqi3xrG`

Only override it if you are running a fork or a different fee wallet.

---

## Run Locally

In development mode using `ts-node`:

```bash
npm run dev
```

Check the fee wallet balance:

```bash
npm run check:balance
```

Run a full simulation without any on-chain execution:

```bash
npm run sim:buyback
```

---

## Run in Dry-Run Mode

Dry-run mode runs the full engine loop including strategy evaluation but submits no transactions. All tranche results are simulated.

```bash
DRY_RUN=true npm run dev
```

Or set `DRY_RUN=true` in your `.env` file.

Dry-run is the recommended mode for:
- Initial setup and validation
- Testing config changes
- Verifying the strategy logic behaves as expected
- CI environments

---

## Build for Production

Compile TypeScript to JavaScript:

```bash
npm run build
```

Run the compiled output:

```bash
npm start
```

---

## Production Notes

**Use a process manager.** In production, run the engine under a process manager like `pm2` or `systemd` so it restarts automatically on crash.

Example with pm2:

```bash
npm install -g pm2
npm run build
pm2 start dist/index.js --name angelic-buyback-engine
pm2 save
pm2 startup
```

**Log rotation.** The engine writes logs to stdout. Configure your process manager or host to handle log rotation. If using pm2:

```bash
pm2 install pm2-logrotate
```

**Monitor the operator wallet.** Set up an alert if the operator wallet's native balance drops below a safe gas reserve level. A drained gas wallet will cause all buyback transactions to fail silently until refilled.

**RPC reliability.** Use a dedicated paid node provider (Alchemy, QuickNode, Helius for Solana-adjacent chains, etc.). Public RPCs are unsuitable for production.

---

## Secrets Handling

Never store your `PRIVATE_KEY` in a plain `.env` file in production. Use one of:

- **AWS Secrets Manager:** Load secrets at runtime via the AWS SDK. Pass values into the process environment before starting the bot.
- **HashiCorp Vault:** Similar pattern. Inject secrets as environment variables at startup.
- **Doppler / Infisical:** Developer-friendly secrets management that integrates directly with Node.js processes.
- **Environment injection via CI/CD:** If deploying via a pipeline, inject secrets as masked environment variables through the CI platform.

The `.env` file pattern is acceptable for local development only. The `.gitignore` in this repo excludes `.env` files, but that is not a substitute for a proper secrets management approach in production.

---

## Checklist Before Going Live

- [ ] `DRY_RUN=false` set intentionally, not by accident
- [ ] `PRIVATE_KEY` is a dedicated hot wallet, not a personal or main wallet
- [ ] Operator wallet has sufficient native token for gas
- [ ] `MIN_TRIGGER_BALANCE` and `MAX_BUYBACK_SIZE` reviewed and set deliberately
- [ ] `BUYBACK_COOLDOWN_SEC` set to a value appropriate for expected fee inflow rate
- [ ] `MAX_SLIPPAGE_BPS` set conservatively for the liquidity depth of the trading pair
- [ ] DEX adapter implemented and tested in dry-run mode before live deployment
- [ ] RPC endpoint is a reliable paid provider
- [ ] Process manager configured for automatic restart
- [ ] Log output monitored or forwarded to an alerting system
- [ ] Fee wallet address confirmed: `D1gPeYYJP15ZZDVQwkWcUrpjus3E6xnirkTWTAqi3xrG`
