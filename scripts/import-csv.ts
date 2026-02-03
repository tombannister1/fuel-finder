import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { config } from "dotenv";
import * as fs from "fs";
import * as path from "path";

// Load environment variables
config({ path: ".env.local" });

const CONVEX_URL = process.env.CONVEX_URL;

if (!CONVEX_URL) {
  console.error("❌ CONVEX_URL not found in .env.local");
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

// Normalize UK postcode to standard format (e.g., "WF9 2WF")
function normalizePostcode(postcode: string): string {
  if (!postcode) return '';
  
  // Remove all whitespace and convert to uppercase
  const cleaned = postcode.replace(/\s+/g, '').toUpperCase();
  
  // UK postcodes are 5-7 characters (without space)
  if (cleaned.length < 5 || cleaned.length > 7) {
    return postcode.trim().toUpperCase(); // Return as-is if invalid length
  }
  
  // The inward code is always the last 3 characters
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
  // Remove leading zeros and apostrophes
  const cleaned = priceStr.replace(/^'0*/, "").replace(/'/g, "");
  const price = parseFloat(cleaned);
  return isNaN(price) ? undefined : price;
}

// Parse boolean
function parseBool(val: string): boolean {
  return val === "true";
}

async function importCSV(csvPath: string) {
  console.log("\n📁 Importing CSV data to Convex");
  console.log("=".repeat(60));
  console.log(`CSV file: ${csvPath}`);
  console.log(`Convex URL: ${CONVEX_URL}\n`);

  // Read CSV file
  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const lines = csvContent.split("\n").filter((line) => line.trim());

  console.log(`📄 Total lines: ${lines.length}`);

  // Parse header
  const headers = parseCSVLine(lines[0]);
  console.log(`✅ Parsed ${headers.length} columns\n`);

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
      console.warn(`⚠️  Line ${i + 1}: missing required fields, skipping`);
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

    // Progress indicator
    if ((i % 50 === 0) || (i === lines.length - 1)) {
      console.log(`📊 Processed ${i}/${lines.length - 1} rows...`);
    }
  }

  console.log(`\n✅ Parsed ${stations.length} stations with ${prices.length} prices\n`);

  // Import to Convex in batches
  const BATCH_SIZE = 50;

  console.log("💾 Uploading stations to Convex...");
  const stationIdMap = new Map<string, string>(); // externalId -> Convex ID
  
  for (let i = 0; i < stations.length; i += BATCH_SIZE) {
    const batch = stations.slice(i, i + BATCH_SIZE);
    const result = await client.mutation(api.stations.batchUpsertStations, {
      stations: batch,
    });
    
    // Map external IDs to Convex IDs
    for (let j = 0; j < batch.length; j++) {
      stationIdMap.set(batch[j].externalId, result[j]);
    }
    
    console.log(`  Uploaded ${Math.min(i + BATCH_SIZE, stations.length)}/${stations.length} stations`);
  }

  console.log("\n💾 Uploading prices to Convex...");
  
  // Convert prices to use Convex station IDs
  const pricesWithIds = prices
    .map((p: any) => {
      const stationId = stationIdMap.get(p.stationExternalId);
      if (!stationId) {
        console.warn(`  ⚠️  Skipping price for unknown station: ${p.stationExternalId}`);
        return null;
      }
      
      // Map fuel type names
      let fuelType = p.fuelType;
      if (fuelType === "B7P") fuelType = "Diesel";
      if (fuelType === "B7S") fuelType = "Super Diesel";
      
      return {
        stationId: stationId as any, // Convex ID
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
    console.log(`  Uploaded ${Math.min(i + BATCH_SIZE, pricesWithIds.length)}/${pricesWithIds.length} prices`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ CSV import complete!");
  console.log(`📍 Stations imported: ${stations.length}`);
  console.log(`⛽ Prices imported: ${prices.length}`);
  console.log("=".repeat(60) + "\n");
}

// Get CSV path from command line or use default
const csvPath =
  process.argv[2] ||
  path.join(process.cwd(), "public", "UpdatedFuelPrice-1770048000015.csv");

if (!fs.existsSync(csvPath)) {
  console.error(`❌ CSV file not found: ${csvPath}`);
  console.log("\nUsage: pnpm import:csv [path/to/file.csv]");
  process.exit(1);
}

importCSV(csvPath).catch((error) => {
  console.error("\n❌ Import failed:", error);
  process.exit(1);
});
