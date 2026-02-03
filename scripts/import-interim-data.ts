/**
 * Import data from interim scheme (real retailers)
 * This uses the publicly available JSON feeds from retailers
 * 
 * Usage: pnpm import:interim
 */

import { config } from "dotenv";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

config({ path: ".env.local" });
config({ path: ".env" });

const CONVEX_URL = process.env.VITE_CONVEX_URL || process.env.CONVEX_URL;

if (!CONVEX_URL) {
  console.error("❌ CONVEX_URL not found");
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

// Interim scheme data sources (actually work!)
const INTERIM_SOURCES = [
  {
    name: "Tesco",
    url: "https://www.tesco.com/fuel_prices/fuel_prices_data.json",
  },
];

interface InterimStation {
  site_id?: string;
  site_name?: string;
  site_brand?: string;
  address?: string;
  postcode?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  prices?: Array<{
    fuel_type: string;
    price: number;
    last_updated: string;
  }>;
}

function normalizeFuelType(type: string): "E5" | "E10" | "Diesel" | "Super Diesel" | "B10" | "HVO" {
  const normalized = type.toLowerCase();
  if (normalized.includes("e5") || normalized === "unleaded") return "E5";
  if (normalized.includes("e10")) return "E10";
  if (normalized.includes("super") && normalized.includes("diesel")) return "Super Diesel";
  if (normalized.includes("diesel")) return "Diesel";
  if (normalized.includes("b10")) return "B10";
  if (normalized.includes("hvo")) return "HVO";
  return "E10"; // Default
}

async function importInterimData() {
  console.log("🔄 Importing data from interim scheme retailers...\n");

  let totalStations = 0;
  let totalPrices = 0;

  for (const source of INTERIM_SOURCES) {
    console.log(`  📡 Fetching data from ${source.name}...`);

    try {
      const response = await fetch(source.url);
      if (!response.ok) {
        console.error(`  ❌ Failed to fetch from ${source.name}: ${response.status}`);
        continue;
      }

      const data = await response.json();
      const stations: InterimStation[] = data.stations || [];

      console.log(`  ✅ Found ${stations.length} stations from ${source.name}\n`);

      for (const station of stations) {
        if (!station.site_id || !station.location) continue;

        console.log(`    📍 Adding: ${station.site_name || 'Unknown'}`);

        // Add station with normalized postcode
        const stationId = await client.mutation(api.stations.upsertStation, {
          externalId: station.site_id,
          name: station.site_name || "Unknown Station",
          brand: station.site_brand || source.name,
          addressLine1: station.address || "Unknown Address",
          city: "",
          postcode: normalizePostcode(station.postcode || "UNKNOWN"),
          latitude: station.location.latitude,
          longitude: station.location.longitude,
        });
        totalStations++;

        // Add prices
        for (const price of station.prices || []) {
          const fuelType = normalizeFuelType(price.fuel_type);
          await client.mutation(api.fuelPrices.addPrice, {
            stationId,
            fuelType,
            price: Math.round(price.price),
            sourceTimestamp: price.last_updated,
          });
          totalPrices++;
        }
      }
    } catch (error) {
      console.error(`  ❌ Error fetching from ${source.name}:`, error);
    }
  }

  console.log("\n✅ Import complete!");
  console.log(`   Stations added: ${totalStations}`);
  console.log(`   Prices added: ${totalPrices}`);
  console.log("\n💡 You can now search for real fuel prices!");
}

importInterimData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
