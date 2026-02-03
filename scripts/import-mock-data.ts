/**
 * Import mock fuel price data for testing
 * This script populates Convex with sample data
 * 
 * Usage: pnpm import:mock
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

// Mock data for testing
const mockStations = [
  {
    externalId: "mock-1",
    name: "Shell Westminster",
    brand: "Shell",
    addressLine1: "123 Victoria Street",
    city: "London",
    postcode: "SW1A 1AA",
    latitude: 51.5014,
    longitude: -0.1419,
  },
  {
    externalId: "mock-2",
    name: "BP Central London",
    brand: "BP",
    addressLine1: "456 Oxford Street",
    city: "London",
    postcode: "W1D 1BS",
    latitude: 51.5155,
    longitude: -0.1426,
  },
  {
    externalId: "mock-3",
    name: "Tesco Westminster Extra",
    brand: "Tesco",
    addressLine1: "789 Whitehall",
    city: "London",
    postcode: "SW1A 2AA",
    latitude: 51.5037,
    longitude: -0.1276,
  },
  {
    externalId: "mock-4",
    name: "Asda Pimlico",
    brand: "Asda",
    addressLine1: "321 Vauxhall Bridge Road",
    city: "London",
    postcode: "SW1V 1DX",
    latitude: 51.4925,
    longitude: -0.1357,
  },
  {
    externalId: "mock-5",
    name: "Sainsbury's Westminster",
    brand: "Sainsburys",
    addressLine1: "654 Horseferry Road",
    city: "London",
    postcode: "SW1P 2AF",
    latitude: 51.4957,
    longitude: -0.1311,
  },
];

const fuelTypes = ["E5", "E10", "Diesel", "Super Diesel"] as const;

async function importMockData() {
  console.log("🔄 Importing mock fuel price data...\n");

  let totalStations = 0;
  let totalPrices = 0;

  for (const station of mockStations) {
    console.log(`  📍 Adding station: ${station.name}`);

    // Add station
    const stationId = await client.mutation(api.stations.upsertStation, station);
    totalStations++;

    // Add prices for each fuel type
    for (const fuelType of fuelTypes) {
      const basePrice = 140 + Math.random() * 20; // Random price between 140-160p
      const price = Math.round(basePrice);

      await client.mutation(api.fuelPrices.addPrice, {
        stationId,
        fuelType,
        price,
        sourceTimestamp: new Date().toISOString(),
      });
      totalPrices++;
    }
  }

  console.log("\n✅ Import complete!");
  console.log(`   Stations added: ${totalStations}`);
  console.log(`   Prices added: ${totalPrices}`);
  console.log("\n💡 You can now test queries in your app!");
}

importMockData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
