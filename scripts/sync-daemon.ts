#!/usr/bin/env tsx
/**
 * Background Sync Daemon - Runs continuously to sync fuel prices
 * 
 * This script runs on your local machine and syncs prices at regular intervals.
 * It's more reliable than cron for frequent updates since it runs from your IP.
 * 
 * Usage:
 *   pnpm sync:daemon              # Default: every 30 minutes
 *   pnpm sync:daemon --interval 15  # Custom: every 15 minutes
 */

import { config } from "dotenv";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

// Load environment variables from .env.local
config({ path: ".env.local" });

// Configuration
const SYNC_INTERVAL_MINUTES = parseInt(process.argv[2]) || 30;
const SYNC_INTERVAL_MS = SYNC_INTERVAL_MINUTES * 60 * 1000;

// Normalize UK postcode
function normalizePostcode(postcode: string): string {
  if (!postcode) return '';
  const cleaned = postcode.replace(/\s+/g, '').toUpperCase();
  if (cleaned.length < 5 || cleaned.length > 7) {
    return postcode.trim().toUpperCase();
  }
  const inward = cleaned.slice(-3);
  const outward = cleaned.slice(0, -3);
  return `${outward} ${inward}`;
}

// Get OAuth token
async function getAccessToken(): Promise<string> {
  const tokenUrl = process.env.FUEL_FINDER_TOKEN_URL || 
    process.env.VITE_FUEL_FINDER_TOKEN_URL ||
    "https://www.fuel-finder.service.gov.uk/api/v1/oauth/generate_access_token";
  const clientId = process.env.FUEL_FINDER_CLIENT_ID || process.env.VITE_FUEL_FINDER_CLIENT_ID;
  const clientSecret = process.env.FUEL_FINDER_CLIENT_SECRET || process.env.VITE_FUEL_FINDER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing FUEL_FINDER_CLIENT_ID or FUEL_FINDER_CLIENT_SECRET in .env.local');
  }

  const tokenResponse = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error(`OAuth failed: ${tokenResponse.status}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.data?.access_token || tokenData.access_token;
}

// Sync prices
async function syncPrices(client: ConvexHttpClient) {
  const startTime = Date.now();
  console.log(`\n⛽ Fetching price data...`);

  try {
    const API_URL = process.env.FUEL_FINDER_API_URL || 
      process.env.VITE_FUEL_FINDER_API_URL ||
      "https://www.fuel-finder.service.gov.uk/api/v1";
    
    const token = await getAccessToken();
    
    let allPrices: any[] = [];
    let batchNumber = 1;
    
    // Fetch all batches
    while (batchNumber <= 14) {
      const url = `${API_URL}/pfs/fuel-prices?batch-number=${batchNumber}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        console.log(`   Batch ${batchNumber}: No more data`);
        break;
      }
      
      const data = await res.json();
      const prices = data.data || data.prices || data;
      
      if (!Array.isArray(prices) || prices.length === 0) {
        console.log(`   Batch ${batchNumber}: Empty`);
        break;
      }
      
      allPrices = allPrices.concat(prices);
      console.log(`   Batch ${batchNumber}: ${prices.length} stations`);
      
      if (prices.length < 500) break;
      batchNumber++;
    }

    console.log(`✅ Fetched ${allPrices.length} stations with prices`);
    
    if (allPrices.length === 0) {
      console.log('⚠️  No prices to sync');
      return { inserted: 0, stationsFound: 0 };
    }

    console.log('🔍 Building station lookup map...');
    
    // Build station lookup
    const stationMap = new Map<string, string>();
    let checked = 0;
    for (const s of allPrices) {
      if (!s.node_id || stationMap.has(s.node_id)) continue;
      
      try {
        const station = await client.query(api.stations.getByExternalId, {
          externalId: String(s.node_id),
        });
        if (station) {
          stationMap.set(s.node_id, station._id);
        }
      } catch (e) {
        // Station not found
      }
      
      checked++;
      if (checked % 500 === 0) {
        console.log(`   Checked ${checked}/${allPrices.length} stations...`);
      }
    }

    console.log(`✅ Found ${stationMap.size} matching stations in database`);
    console.log('💾 Processing prices...');

    // Process prices
    const pricesToInsert: any[] = [];
    for (const stationWithPrices of allPrices) {
      const stationId = stationMap.get(stationWithPrices.node_id);
      if (!stationId) continue;

      const fuelPrices = stationWithPrices.fuel_prices || [];
      for (const fp of fuelPrices) {
        let fuelType = fp.fuel_type;
        if (fuelType === "B7_STANDARD") fuelType = "Diesel";
        if (fuelType === "B7_PREMIUM") fuelType = "Super Diesel";
        if (fuelType === "E5_PREMIUM") fuelType = "E5";

        const validTypes = ["E5", "E10", "Diesel", "Super Diesel", "B10", "HVO"];
        if (!validTypes.includes(fuelType)) continue;

        const priceValue = parseFloat(fp.price?.replace(/^'?0*/, '') || '0');
        if (isNaN(priceValue) || priceValue <= 0) continue;

        pricesToInsert.push({
          stationId: stationId as any,
          fuelType: fuelType as any,
          price: Math.round(priceValue * 10) / 10,
          sourceTimestamp: fp.price_last_updated || new Date().toISOString(),
        });
      }
    }

    console.log(`📦 Inserting ${pricesToInsert.length} prices in batches...`);

    // Insert in batches
    let inserted = 0;
    for (let i = 0; i < pricesToInsert.length; i += 50) {
      const batch = pricesToInsert.slice(i, i + 50);
      await client.mutation(api.fuelPrices.batchAddPrices, { prices: batch as any });
      inserted += batch.length;
      
      if ((i + 50) % 500 === 0) {
        console.log(`   Inserted ${inserted}/${pricesToInsert.length}...`);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Sync complete: ${inserted} prices in ${duration}s`);
    
    return { inserted, stationsFound: stationMap.size };

  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`❌ Sync failed after ${duration}s:`, error);
    throw error;
  }
}

// Main daemon loop
async function main() {
  console.log('🚀 Fuel Price Sync Daemon Starting...');
  console.log('='.repeat(60));
  console.log(`📅 Sync interval: ${SYNC_INTERVAL_MINUTES} minutes`);
  console.log(`🔄 Press Ctrl+C to stop`);
  console.log('='.repeat(60));

  const CONVEX_URL = process.env.CONVEX_URL || process.env.VITE_CONVEX_URL;
  if (!CONVEX_URL) {
    console.error('❌ CONVEX_URL not set in environment');
    process.exit(1);
  }

  const client = new ConvexHttpClient(CONVEX_URL);

  let runCount = 0;
  
  // Run immediately on start
  try {
    runCount++;
    console.log(`\n[Run #${runCount}] ${new Date().toLocaleString()}`);
    await syncPrices(client);
  } catch (error) {
    console.error('❌ Initial sync failed:', error);
  }

  // Then run on interval
  setInterval(async () => {
    try {
      runCount++;
      console.log(`\n[Run #${runCount}] ${new Date().toLocaleString()}`);
      await syncPrices(client);
      console.log(`⏰ Next sync in ${SYNC_INTERVAL_MINUTES} minutes...`);
    } catch (error) {
      console.error('❌ Sync failed:', error);
      console.log(`⏰ Will retry in ${SYNC_INTERVAL_MINUTES} minutes...`);
    }
  }, SYNC_INTERVAL_MS);

  console.log(`\n⏰ Next sync in ${SYNC_INTERVAL_MINUTES} minutes...`);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down daemon...');
  process.exit(0);
});

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
