/**
 * Vercel Cron Job: Import fuel price data from CSV to Convex
 * 
 * Runs every 30 minutes to update fuel prices
 * URL: /api/cron/import-fuel-data
 * Schedule: */30 * * * * (every 30 minutes)
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

// Parse CSV line handling quoted values
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Parse price string like '0126.9000 to number 126.9
function parsePrice(priceStr: string): number | undefined {
  if (!priceStr || priceStr === "") return undefined;
  const cleaned = priceStr.replace(/^'0*/, "").replace(/'/g, "");
  const price = parseFloat(cleaned);
  return isNaN(price) ? undefined : price;
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  // Verify this is a cron request (Vercel adds this header)
  const authHeader = request.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.log('❌ Unauthorized cron request');
    return response.status(401).json({ error: 'Unauthorized' });
  }

  const startTime = Date.now();
  console.log('\n🔄 Starting scheduled fuel price import...');
  console.log('='.repeat(60));

  try {
    // Get Convex URL from environment
    const CONVEX_URL = process.env.CONVEX_URL || process.env.VITE_CONVEX_URL;
    if (!CONVEX_URL) {
      throw new Error('CONVEX_URL not configured');
    }

    const client = new ConvexHttpClient(CONVEX_URL);

    // Fetch the CSV file from your data source
    // For now, we'll fetch from a public URL or use the static file
    // You can replace this with your actual data source
    const CSV_URL = process.env.FUEL_DATA_CSV_URL || 
      `${process.env.VERCEL_URL || 'http://localhost:3000'}/UpdatedFuelPrice-1770048000015.csv`;
    
    console.log(`📥 Fetching CSV from: ${CSV_URL}`);
    
    const csvResponse = await fetch(CSV_URL);
    if (!csvResponse.ok) {
      throw new Error(`Failed to fetch CSV: ${csvResponse.status}`);
    }

    const csvContent = await csvResponse.text();
    const lines = csvContent.split("\n").filter((line) => line.trim());

    console.log(`📄 Total lines: ${lines.length}`);

    // Parse header
    const headers = parseCSVLine(lines[0]);
    console.log(`✅ Parsed ${headers.length} columns`);

    // Process data rows
    const stations: any[] = [];
    const prices: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);

      if (values.length !== headers.length) {
        console.warn(`⚠️  Line ${i + 1}: column mismatch, skipping`);
        continue;
      }

      // Create row object
      const row: any = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx];
      });

      // Extract station data
      const stationId = row["forecourts.node_id"];
      const postcode = row["forecourts.location.postcode"];
      const lat = parseFloat(row["forecourts.location.latitude"]);
      const lng = parseFloat(row["forecourts.location.longitude"]);

      if (!stationId || !postcode || isNaN(lat) || isNaN(lng)) {
        continue;
      }

      const station = {
        externalId: stationId,
        name: row["forecourts.trading_name"] || "Unknown",
        brand: row["forecourts.brand_name"] || undefined,
        addressLine1: row["forecourts.location.address_line_1"] || "Unknown",
        addressLine2: row["forecourts.location.address_line_2"] || undefined,
        city: row["forecourts.location.city"] || "Unknown",
        county: row["forecourts.location.county"] || undefined,
        postcode: normalizePostcode(postcode),
        latitude: lat,
        longitude: lng,
      };

      stations.push(station);

      // Extract fuel prices
      const fuelTypes = ["E5", "E10", "B7P", "B7S", "B10", "HVO"];
      for (const fuelType of fuelTypes) {
        const priceKey = `forecourts.fuel_price.${fuelType}`;
        const price = parsePrice(row[priceKey]);

        if (price !== undefined) {
          prices.push({
            stationExternalId: stationId,
            fuelType: fuelType,
            price: price,
            timestamp: new Date(row["latest_update_timestamp"]).getTime(),
          });
        }
      }
    }

    console.log(`\n✅ Parsed ${stations.length} stations with ${prices.length} prices`);

    // Import to Convex in batches
    const BATCH_SIZE = 50;
    const stationIdMap = new Map<string, string>();

    console.log('💾 Uploading stations to Convex...');
    for (let i = 0; i < stations.length; i += BATCH_SIZE) {
      const batch = stations.slice(i, i + BATCH_SIZE);
      const result = await client.mutation(api.stations.batchUpsertStations, {
        stations: batch,
      });
      
      for (let j = 0; j < batch.length; j++) {
        stationIdMap.set(batch[j].externalId, result[j]);
      }
      
      console.log(`  Progress: ${Math.min(i + BATCH_SIZE, stations.length)}/${stations.length} stations`);
    }

    console.log('💾 Uploading prices to Convex...');
    
    const pricesWithIds = prices
      .map((p: any) => {
        const stationId = stationIdMap.get(p.stationExternalId);
        if (!stationId) return null;
        
        let fuelType = p.fuelType;
        if (fuelType === "B7P") fuelType = "Diesel";
        if (fuelType === "B7S") fuelType = "Super Diesel";
        
        return {
          stationId: stationId as any,
          fuelType: fuelType,
          price: p.price,
          sourceTimestamp: new Date(p.timestamp).toISOString(),
        };
      })
      .filter(Boolean);

    for (let i = 0; i < pricesWithIds.length; i += BATCH_SIZE) {
      const batch = pricesWithIds.slice(i, i + BATCH_SIZE);
      await client.mutation(api.fuelPrices.batchAddPrices, {
        prices: batch as any,
      });
      console.log(`  Progress: ${Math.min(i + BATCH_SIZE, pricesWithIds.length)}/${pricesWithIds.length} prices`);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n' + '='.repeat(60));
    console.log('✅ Import complete!');
    console.log(`📍 Stations imported: ${stations.length}`);
    console.log(`⛽ Prices imported: ${prices.length}`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log('='.repeat(60) + '\n');

    return response.status(200).json({
      success: true,
      stationsImported: stations.length,
      pricesImported: prices.length,
      duration: `${duration}s`,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('\n❌ Import failed:', error);
    
    return response.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}
