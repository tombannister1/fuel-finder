#!/usr/bin/env tsx
/**
 * Cleanup script to remove bad price data from the database
 * Removes all prices below 50p (which are invalid due to the price conversion bug)
 */

import { config } from "dotenv";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

config({ path: ".env.local" });

async function cleanupBadPrices() {
  console.log("🧹 Starting bad price cleanup...\n");

  const CONVEX_URL = process.env.CONVEX_URL || process.env.VITE_CONVEX_URL;
  if (!CONVEX_URL) {
    throw new Error("CONVEX_URL not configured");
  }

  const client = new ConvexHttpClient(CONVEX_URL);

  try {
    console.log("🗑️  Deleting all prices below 50p (invalid data)...");
    
    const result = await client.action(api.sync.cleanupBadPrices, {});
    
    console.log(`\n✅ Cleanup complete!`);
    console.log(`   Deleted: ${result.deleted} invalid price records`);
    console.log(`\n💡 Next step: Run "pnpm sync:daemon" to re-import correct prices`);

  } catch (error) {
    console.error("❌ Cleanup failed:", error);
    throw error;
  }
}

cleanupBadPrices()
  .then(() => {
    console.log("\n✅ Done");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
