#!/usr/bin/env tsx
/**
 * Local sync script - fetches API data locally and stores in Convex
 * This bypasses the IP blocking issue with Convex servers
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const CONVEX_URL = process.env.CONVEX_URL || process.env.VITE_CONVEX_URL;
const CLIENT_ID = process.env.VITE_FUEL_FINDER_CLIENT_ID;
const CLIENT_SECRET = process.env.VITE_FUEL_FINDER_CLIENT_SECRET;
const API_URL = process.env.VITE_FUEL_FINDER_API_URL || "https://www.fuel-finder.service.gov.uk/api/v1";
const TOKEN_URL = process.env.VITE_FUEL_FINDER_TOKEN_URL || "https://www.fuel-finder.service.gov.uk/api/v1/oauth/generate_access_token";

if (!CONVEX_URL || !CLIENT_ID || !CLIENT_SECRET) {
  console.error("❌ Missing required environment variables");
  process.exit(1);
}

const syncType = process.argv[2] || "both";

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

async function getAccessToken(): Promise<string> {
  console.log("🔐 Getting OAuth token...");
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });

  if (!response.ok) {
    throw new Error(`OAuth failed: ${response.status}`);
  }

  const data = await response.json();
  return data.data?.access_token || data.access_token;
}

async function syncStations(client: ConvexHttpClient, token: string) {
  console.log("\n🏪 Syncing station metadata...");
  let allStations: any[] = [];
  let batchNumber = 1;
  let hasMore = true;

  while (hasMore) {
    console.log(`  Fetching batch ${batchNumber}...`);
    const response = await fetch(`${API_URL}/pfs?batch-number=${batchNumber}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`API failed: ${response.status}`);
    }

    const data = await response.json();
    const stations = data.data || data.stations || data;
    
    if (!Array.isArray(stations) || stations.length === 0) {
      console.log(`    ℹ️  Empty batch - stopping`);
      hasMore = false;
    } else {
      allStations = allStations.concat(stations);
      const isFullBatch = stations.length >= 500;
      console.log(`    ✅ ${stations.length} stations${!isFullBatch ? ' (last batch)' : ''}`);
      console.log(`    📊 Total so far: ${allStations.length}`);
      hasMore = isFullBatch;
      batchNumber++;
    }
  }
  
  console.log(`\n📊 Fetched ${allStations.length} stations from ${batchNumber - 1} batch(es)`);

  console.log(`\n💾 Saving ${allStations.length} stations to Convex...`);
  
  const BATCH_SIZE = 25; // Reduced batch size for reliability
  let processed = 0;
  let errors = 0;
  
  for (let i = 0; i < allStations.length; i += BATCH_SIZE) {
    const batch = allStations.slice(i, i + BATCH_SIZE);
    
    // Log first station structure for debugging
    if (i === 0) {
      console.log("\n📋 Sample station structure:");
      console.log(JSON.stringify(batch[0], null, 2).substring(0, 500));
    }
    
    const stationsToUpsert = batch
      .map((station, idx) => {
        const location = station.location || {};
        const postcode = normalizePostcode(location.postcode || '');
        const lat = Number(location.latitude || 0);
        const lng = Number(location.longitude || 0);
        
        return {
          externalId: String(station.node_id || station.station_id || station.id || `unknown_${i + idx}`),
          name: String(station.trading_name || station.station_name || station.name || 'Unknown Station').slice(0, 200),
          brand: station.brand_name || station.brand || undefined,
          addressLine1: String(location.address_line_1 || 'Unknown').slice(0, 200),
          addressLine2: location.address_line_2 ? String(location.address_line_2).slice(0, 200) : undefined,
          city: String(location.city || 'Unknown').slice(0, 100),
          county: location.county ? String(location.county).slice(0, 100) : undefined,
          postcode: postcode || 'UNKNOWN',
          latitude: isNaN(lat) ? 0 : lat,
          longitude: isNaN(lng) ? 0 : lng,
          amenities: Array.isArray(station.amenities) ? station.amenities.map(String) : undefined,
        };
      })
      .filter(s => s.externalId && s.name && s.addressLine1 && s.city && s.postcode !== 'UNKNOWN'); // Filter out invalid entries

    // Retry logic
    let retries = 3;
    let success = false;
    
    while (retries > 0 && !success) {
      try {
        await client.mutation(api.stations.batchUpsertStations, {
          stations: stationsToUpsert,
        });
        success = true;
        processed += batch.length;
      } catch (error) {
        retries--;
        if (retries === 0) {
          console.error(`  ❌ Failed batch ${i}-${i + batch.length}: ${error}`);
          errors += batch.length;
        } else {
          console.log(`  ⚠️  Retry (${3 - retries}/3) for batch ${i}...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
        }
      }
    }

    if (processed % 100 === 0 || processed === allStations.length) {
      console.log(`  Progress: ${processed}/${allStations.length}`);
    }
  }
  
  if (errors > 0) {
    console.log(`⚠️  ${errors} stations failed to save`);
  }

  console.log(`✅ Stations synced: ${processed}${errors > 0 ? ` (${errors} failed)` : ''}`);
  return processed;
}

async function syncPrices(client: ConvexHttpClient, token: string) {
  console.log("\n⛽ Syncing price data...");
  let allPrices: any[] = [];
  let batchNumber = 1;
  let hasMore = true;

  // For now, fetch all prices (no timestamp filter)
  while (hasMore) {
    console.log(`  Fetching batch ${batchNumber}...`);
    const url = `${API_URL}/pfs/fuel-prices?batch-number=${batchNumber}`;
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`API failed: ${response.status}`);
    }

    const data = await response.json();
    const prices = data.data || data.prices || data;
    
    if (!Array.isArray(prices) || prices.length === 0) {
      console.log(`    ℹ️  Empty batch - stopping`);
      hasMore = false;
    } else {
      allPrices = allPrices.concat(prices);
      const isFullBatch = prices.length >= 500;
      console.log(`    ✅ ${prices.length} price updates${!isFullBatch ? ' (last batch)' : ''}`);
      console.log(`    📊 Total so far: ${allPrices.length}`);
      hasMore = isFullBatch;
      batchNumber++;
    }
  }
  
  console.log(`\n📊 Fetched ${allPrices.length} prices from ${batchNumber - 1} batch(es)`);

  // The API returns stations with nested fuel_prices arrays
  console.log(`\n💾 Processing ${allPrices.length} stations with price data...`);
  
  // First, build a map of externalId -> stationId for fast lookup
  console.log("  Building station lookup map...");
  const stationMap = new Map<string, string>();
  let stationsChecked = 0;
  let stationsFound = 0;
  
  for (const stationWithPrices of allPrices) {
    const externalId = stationWithPrices.node_id;
    if (!externalId || stationMap.has(externalId)) continue;
    
    stationsChecked++;
    
    try {
      const station = await client.query(api.stations.getByExternalId, {
        externalId: String(externalId),
      });
      if (station) {
        stationMap.set(externalId, station._id);
        stationsFound++;
      }
    } catch (error) {
      // Skip stations we can't find
    }
    
    // Progress every 100 stations
    if (stationsChecked % 100 === 0) {
      console.log(`    Progress: ${stationsChecked}/${allPrices.length} checked, ${stationsFound} found`);
    }
  }
  
  console.log(`  ✅ Found ${stationMap.size} matching stations out of ${stationsChecked} checked`);
  console.log("  Processing prices in batches...");
  
  let totalPrices = 0;
  let skipped = 0;
  let errors = 0;
  const pricesToInsert: any[] = [];

  // Build array of all prices
  for (const stationWithPrices of allPrices) {
    const stationExternalId = stationWithPrices.node_id;
    const fuelPrices = stationWithPrices.fuel_prices || [];

    if (!stationExternalId || !Array.isArray(fuelPrices) || fuelPrices.length === 0) {
      continue;
    }

    const stationId = stationMap.get(stationExternalId);
    if (!stationId) {
      skipped += fuelPrices.length;
      continue;
    }

    // Process each fuel price for this station
    for (const fuelPrice of fuelPrices) {
      const fuelTypeRaw = fuelPrice.fuel_type || fuelPrice.fuelType;
      const priceStr = fuelPrice.price;
      const timestamp = fuelPrice.price_last_updated || fuelPrice.last_updated || new Date().toISOString();

      if (!fuelTypeRaw || !priceStr) {
        skipped++;
        continue;
      }

      // Map fuel types
      let fuelType = fuelTypeRaw;
      if (fuelTypeRaw === "B7_STANDARD" || fuelTypeRaw === "B7P") fuelType = "Diesel";
      if (fuelTypeRaw === "B7_PREMIUM" || fuelTypeRaw === "B7S") fuelType = "Super Diesel";
      if (fuelTypeRaw === "E5_PREMIUM") fuelType = "E5";

      const validFuelTypes = ["E5", "E10", "Diesel", "Super Diesel", "B10", "HVO"];
      if (!validFuelTypes.includes(fuelType)) {
        skipped++;
        continue;
      }

      // Parse price string (e.g., "0126.9000" -> 126.9)
      const priceValue = parseFloat(priceStr.replace(/^'?0*/, ''));
      if (isNaN(priceValue)) {
        skipped++;
        continue;
      }

      pricesToInsert.push({
        stationId: stationId as any,
        fuelType: fuelType as any,
        price: Math.round(priceValue * 10) / 10,
        sourceTimestamp: timestamp,
      });
    }
  }

  console.log(`  📊 Prepared ${pricesToInsert.length} prices to insert`);
  
  // Insert in batches
  const BATCH_SIZE = 50;
  for (let i = 0; i < pricesToInsert.length; i += BATCH_SIZE) {
    const batch = pricesToInsert.slice(i, i + BATCH_SIZE);
    
    try {
      await client.mutation(api.fuelPrices.batchAddPrices, {
        prices: batch as any,
      });
      totalPrices += batch.length;
      
      if (totalPrices % 500 === 0) {
        console.log(`  Progress: ${totalPrices}/${pricesToInsert.length} prices`);
      }
    } catch (error) {
      errors++;
      if (errors < 10) {
        console.error(`  ❌ Error saving batch: ${error}`);
      }
    }
  }
  
  if (errors > 0) {
    console.log(`⚠️  ${errors} batch errors`);
  }

  console.log(`✅ Prices synced: ${totalPrices}${errors > 0 ? ` (${errors} station errors)` : ''}`);
  if (skipped > 0) {
    console.log(`⚠️  Skipped: ${skipped} prices (stations not found or invalid data)`);
  }
  return totalPrices;
}

async function main() {
  console.log("\n🚀 Starting local API sync...");
  console.log("=".repeat(60));
  console.log(`📡 Convex URL: ${CONVEX_URL}`);
  console.log(`🔄 Sync Type: ${syncType}`);
  console.log("=".repeat(60));

  const client = new ConvexHttpClient(CONVEX_URL);
  const startTime = Date.now();

  try {
    const token = await getAccessToken();
    console.log("✅ OAuth token obtained\n");

    let stationsCount = 0;
    let pricesCount = 0;

    if (syncType === "stations" || syncType === "both") {
      stationsCount = await syncStations(client, token);
    }

    if (syncType === "prices" || syncType === "both") {
      pricesCount = await syncPrices(client, token);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log("\n" + "=".repeat(60));
    console.log("✅ Sync complete!");
    if (stationsCount > 0) console.log(`📍 Stations: ${stationsCount}`);
    if (pricesCount > 0) console.log(`⛽ Prices: ${pricesCount}`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log("=".repeat(60) + "\n");

  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error("\n" + "=".repeat(60));
    console.error("❌ Sync failed!");
    console.error(`⏱️  Duration: ${duration}s`);
    console.error("=".repeat(60));
    console.error("\nError:", error);
    process.exit(1);
  }
}

main();
