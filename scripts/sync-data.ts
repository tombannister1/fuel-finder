/**
 * Script to sync fuel price data from API to Convex
 * 
 * Usage:
 *   npx tsx scripts/sync-data.ts postcode SW1A1AA
 *   npx tsx scripts/sync-data.ts full
 */

import { config } from "dotenv";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

// Load environment variables from .env.local
config({ path: ".env.local" });
config({ path: ".env" });

const CONVEX_URL = process.env.VITE_CONVEX_URL || process.env.CONVEX_URL;

if (!CONVEX_URL) {
  console.error("❌ CONVEX_URL not found in environment variables");
  console.error("Make sure you've run 'npx convex dev' first");
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

async function syncByPostcode(postcode: string, radius: number = 10) {
  console.log(`🔄 Syncing fuel prices for postcode: ${postcode} (${radius} miles radius)`);
  console.log(`⏳ Please wait, this may take a minute...`);
  
  try {
    const result = await client.action(api.sync.syncByPostcode, {
      postcode,
      radius,
    });

    if (result.success) {
      console.log(`\n✅ Sync complete!`);
      console.log(`   Stations processed: ${result.stationsProcessed}`);
      console.log(`   Prices processed: ${result.pricesProcessed}`);
    } else {
      console.error(`\n❌ Sync failed: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

async function fullSync() {
  console.log("🔄 Starting full sync from API...");
  console.log("⏳ Fetching data (this may take 1-2 minutes)...");
  console.log("💡 Tip: Watch Convex logs at http://127.0.0.1:6790/?d=anonymous-fuelfinder\n");
  
  try {
    const result = await client.action(api.sync.fullSync, {});

    if (result.success) {
      console.log(`\n✅ Sync complete!`);
      console.log(`   📍 Stations processed: ${result.stationsProcessed}`);
      console.log(`   ⛽ Prices processed: ${result.pricesProcessed}`);
    } else {
      console.error(`\n❌ Sync failed: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

if (command === "postcode") {
  const postcode = args[1];
  const radius = args[2] ? parseInt(args[2]) : 10;
  
  if (!postcode) {
    console.error("❌ Please provide a postcode");
    console.error("Usage: npx tsx scripts/sync-data.ts postcode SW1A1AA [radius]");
    process.exit(1);
  }
  
  syncByPostcode(postcode, radius).then(() => {
    console.log("✅ Done!");
    process.exit(0);
  });
} else if (command === "full") {
  fullSync().then(() => {
    console.log("✅ Done!");
    process.exit(0);
  });
} else {
  console.error("❌ Invalid command");
  console.error("\nUsage:");
  console.error("  npx tsx scripts/sync-data.ts postcode <POSTCODE> [radius]");
  console.error("  npx tsx scripts/sync-data.ts full");
  console.error("\nExamples:");
  console.error("  npx tsx scripts/sync-data.ts postcode SW1A1AA");
  console.error("  npx tsx scripts/sync-data.ts postcode SW1A1AA 15");
  console.error("  npx tsx scripts/sync-data.ts full");
  process.exit(1);
}
