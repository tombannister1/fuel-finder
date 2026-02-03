/**
 * Vercel Cron Job: Import fuel price data from API to Convex
 * 
 * Strategy:
 * - Syncs price updates daily at 1 AM UTC
 * - Station metadata synced manually via `pnpm sync:stations`
 * 
 * This fetches data directly from the Fuel Finder API (bypassing IP blocks)
 * and stores it in Convex using mutations.
 * 
 * URL: /api/cron/import-fuel-data
 * Schedule: Daily at 1 AM UTC (cron: 0 1 * * *)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

// Normalize UK postcode to standard format (e.g., "WF9 2WF")
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
  const tokenUrl = process.env.FUEL_FINDER_TOKEN_URL ||
    "https://www.fuel-finder.service.gov.uk/api/v1/oauth/generate_access_token";
  const clientId = process.env.FUEL_FINDER_CLIENT_ID;
  const clientSecret = process.env.FUEL_FINDER_CLIENT_SECRET;

  const tokenResponse = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId!,
      client_secret: clientSecret!,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error(`OAuth failed: ${tokenResponse.status}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.data?.access_token || tokenData.access_token;
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  // Verify this is a cron request
  const authHeader = request.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.log('❌ Unauthorized cron request');
    return response.status(401).json({ error: 'Unauthorized' });
  }

  const startTime = Date.now();
  console.log('\n🔄 Starting daily fuel price sync...');

  try {
    const CONVEX_URL = process.env.CONVEX_URL || process.env.VITE_CONVEX_URL;
    const API_URL = process.env.FUEL_FINDER_API_URL || 
      "https://www.fuel-finder.service.gov.uk/api/v1";

    if (!CONVEX_URL) {
      throw new Error('CONVEX_URL not configured');
    }

    const client = new ConvexHttpClient(CONVEX_URL);
    const token = await getAccessToken();

    // Prices only (stations are synced manually/weekly)
    console.log('⛽ Fetching price data from API...');
    
    let allPrices: any[] = [];
    let batchNumber = 1;
    
    // Fetch all price data (limited to 3 batches for cron timeout)
    while (batchNumber <= 14) {
      const url = `${API_URL}/pfs/fuel-prices?batch-number=${batchNumber}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      if (!res.ok) break;
      
      const data = await res.json();
      const prices = data.data || data.prices || data;
      
      if (!Array.isArray(prices) || prices.length === 0) break;
      
      allPrices = allPrices.concat(prices);
      console.log(`  Batch ${batchNumber}: ${prices.length} stations`);
      
      if (prices.length < 500) break;
      batchNumber++;
    }

    console.log(`✅ Fetched ${allPrices.length} stations with prices`);
    console.log('💾 Building station lookup...');

    // Get unique external IDs
    const uniqueIds = [...new Set(allPrices.map(s => String(s.node_id)).filter(Boolean))];
    
    // Query in batches of 500
    const stationMap = new Map<string, string>();
    for (let i = 0; i < uniqueIds.length; i += 500) {
      const batch = uniqueIds.slice(i, i + 500);
      const batchResults = await client.query(api.stations.getStationIdsBatch, {
        externalIds: batch,
      });
      
      Object.entries(batchResults).forEach(([externalId, stationId]) => {
        stationMap.set(externalId, stationId);
      });
    }
    
    console.log(`✅ Found ${stationMap.size} matching stations`);

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
        if (isNaN(priceValue)) continue;

        // API returns prices in pence (e.g., "0126.9000" = 126.9p)
        // Store as integer in pence
        const priceInPence = Math.round(priceValue);
        
        // Validate price range (normal UK fuel prices are 100-200p)
        if (priceInPence < 50 || priceInPence > 300) {
          console.warn(`  ⚠️  Skipping suspicious price: ${priceInPence}p for ${fuelType}`);
          continue;
        }

        pricesToInsert.push({
          stationId: stationId as any,
          fuelType: fuelType as any,
          price: priceInPence,
          sourceTimestamp: fp.price_last_updated || new Date().toISOString(),
        });
      }
    }

    // Insert in batches
    let inserted = 0;
    for (let i = 0; i < pricesToInsert.length; i += 50) {
      const batch = pricesToInsert.slice(i, i + 50);
      await client.mutation(api.fuelPrices.batchAddPrices, { prices: batch as any });
      inserted += batch.length;
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Sync complete: ${inserted} prices in ${duration}s`);

    return response.status(200).json({
      success: true,
      pricesProcessed: inserted,
      stationsFound: stationMap.size,
      duration: `${duration}s`,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error('❌ Sync failed:', error);
    
    return response.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}s`,
      timestamp: new Date().toISOString(),
    });
  }
}
