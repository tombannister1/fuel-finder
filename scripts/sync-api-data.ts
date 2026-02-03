#!/usr/bin/env tsx
/**
 * Sync fuel data from API to Convex
 * 
 * Usage:
 *   tsx scripts/sync-api-data.ts stations  # Sync station metadata
 *   tsx scripts/sync-api-data.ts prices    # Sync price updates
 *   tsx scripts/sync-api-data.ts both      # Sync both (default)
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const CONVEX_URL = process.env.CONVEX_URL || process.env.VITE_CONVEX_URL;

if (!CONVEX_URL) {
  console.error("❌ Error: CONVEX_URL not found in environment variables");
  console.error("   Make sure .env.local has CONVEX_URL or VITE_CONVEX_URL set");
  process.exit(1);
}

const syncType = process.argv[2] || "both";

async function main() {
  console.log("\n🚀 Starting API sync...");
  console.log("=".repeat(60));
  console.log(`📡 Convex URL: ${CONVEX_URL}`);
  console.log(`🔄 Sync Type: ${syncType}`);
  console.log("=".repeat(60) + "\n");

  const client = new ConvexHttpClient(CONVEX_URL);
  const startTime = Date.now();

  try {
    if (syncType === "stations" || syncType === "both") {
      console.log("🏪 Syncing station metadata...\n");
      const stationsResult = await client.action(api.sync.syncStations, {});
      
      if (stationsResult.success) {
        console.log(`\n✅ Stations synced: ${stationsResult.stationsProcessed}`);
      } else {
        console.error(`\n❌ Station sync failed: ${stationsResult.error}`);
      }
    }

    if (syncType === "prices" || syncType === "both") {
      console.log("\n⛽ Syncing price data...\n");
      const pricesResult = await client.action(api.sync.syncPrices, {});
      
      if (pricesResult.success) {
        console.log(`\n✅ Prices synced: ${pricesResult.pricesProcessed}`);
        if (pricesResult.stationsNotFound && pricesResult.stationsNotFound > 0) {
          console.log(`⚠️  Prices skipped (stations not found): ${pricesResult.stationsNotFound}`);
          console.log("   Run 'pnpm sync:stations' to fetch station data first");
        }
      } else {
        console.error(`\n❌ Price sync failed: ${pricesResult.error}`);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log("\n" + "=".repeat(60));
    console.log("✅ Sync complete!");
    console.log(`⏱️  Duration: ${duration}s`);
    console.log("=".repeat(60) + "\n");

  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error("\n" + "=".repeat(60));
    console.error("❌ Sync failed!");
    console.error(`⏱️  Duration: ${duration}s`);
    console.error("=".repeat(60));
    console.error("\nError details:");
    console.error(error);
    console.error("\nTroubleshooting:");
    console.error("1. Check your CONVEX_URL in .env.local");
    console.error("2. Verify Convex environment variables are set:");
    console.error("   npx convex env list");
    console.error("3. Make sure you've deployed the latest schema:");
    console.error("   pnpm convex:deploy\n");
    process.exit(1);
  }
}

main();
