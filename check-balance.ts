/**
 * scripts/check-balance.ts
 *
 * One-shot script: connects to the RPC, fetches the fee wallet balance,
 * and prints it to stdout. No strategy evaluation. No execution.
 *
 * Usage: npm run check:balance
 */

import "dotenv/config";
import { JsonRpcProvider } from "ethers";
import { loadConfig, CANONICAL_FEE_WALLET } from "../src/config.js";
import { getWalletBalance } from "../src/wallets.js";
import { formatNative, shortAddress } from "../src/utils/format.js";

async function main() {
  const config = loadConfig();
  const provider = new JsonRpcProvider(config.rpcUrl);

  const feeWallet = config.feeWallet || CANONICAL_FEE_WALLET;

  console.log("");
  console.log("  Angelic Buyback Engine -- Balance Check");
  console.log("  ----------------------------------------");
  console.log(`  Fee wallet : ${feeWallet}`);
  console.log(`  RPC        : ${shortAddress(config.rpcUrl)}`);
  console.log("");

  try {
    const balance = await getWalletBalance(provider, feeWallet);
    console.log(`  Balance    : ${formatNative(balance.nativeBalance)} ETH`);
    console.log(`  Raw (wei)  : ${balance.nativeBalance.toString()}`);
    console.log(`  Checked at : ${balance.checkedAt.toISOString()}`);
    console.log("");

    const threshold = config.minTriggerBalance;
    const meetsThreshold = balance.nativeBalance >= threshold;
    console.log(`  Threshold  : ${formatNative(threshold)} ETH`);
    console.log(`  Triggered  : ${meetsThreshold ? "YES" : "NO"}`);
    console.log("");
  } catch (err) {
    console.error("  Error fetching balance:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();
