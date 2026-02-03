/**
 * Test the Fuel Finder API to understand authentication
 */

import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const API_URL = "https://www.fuel-finder.service.gov.uk/api/v1/pfs/fuel-prices?batch-number=1";
const CLIENT_ID = process.env.VITE_FUEL_FINDER_CLIENT_ID;
const CLIENT_SECRET = process.env.VITE_FUEL_FINDER_CLIENT_SECRET;

async function testAPI() {
  console.log("🔍 Testing Fuel Finder API...\n");
  
  // Test 1: Try without auth
  console.log("Test 1: No authentication");
  try {
    const response = await fetch(API_URL);
    console.log(`  Status: ${response.status}`);
    if (response.ok) {
      const data = await response.json();
      console.log(`  ✅ Works without auth!`);
      console.log(`  Data keys:`, Object.keys(data));
      return;
    }
  } catch (error) {
    console.log(`  ❌ Error:`, error);
  }
  
  // Test 2: Try with Basic Auth
  console.log("\nTest 2: Basic Authentication");
  try {
    const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    const response = await fetch(API_URL, {
      headers: {
        'Authorization': `Basic ${auth}`,
      }
    });
    console.log(`  Status: ${response.status}`);
    if (response.ok) {
      const data = await response.json();
      console.log(`  ✅ Works with Basic auth!`);
      console.log(`  Data keys:`, Object.keys(data));
      return;
    }
  } catch (error) {
    console.log(`  ❌ Error:`, error);
  }
  
  // Test 3: Try with API Key header
  console.log("\nTest 3: API Key in header");
  try {
    const response = await fetch(API_URL, {
      headers: {
        'X-API-Key': CLIENT_ID || '',
        'Authorization': `Bearer ${CLIENT_ID}`,
      }
    });
    console.log(`  Status: ${response.status}`);
    if (response.ok) {
      const data = await response.json();
      console.log(`  ✅ Works with API Key!`);
      console.log(`  Data keys:`, Object.keys(data));
      return;
    }
  } catch (error) {
    console.log(`  ❌ Error:`, error);
  }
  
  // Test 4: Try different OAuth endpoints
  console.log("\nTest 4: Testing OAuth endpoints");
  const oauthEndpoints = [
    "https://www.fuel-finder.service.gov.uk/oauth2/token",
    "https://www.fuel-finder.service.gov.uk/oauth/token",
    "https://www.fuel-finder.service.gov.uk/api/v1/oauth/token",
    "https://www.fuel-finder.service.gov.uk/auth/token",
  ];
  
  for (const endpoint of oauthEndpoints) {
    console.log(`  Trying: ${endpoint}`);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: CLIENT_ID || '',
          client_secret: CLIENT_SECRET || '',
        }),
      });
      console.log(`    Status: ${response.status}`);
      if (response.ok || response.status === 401) {
        console.log(`    ✅ Endpoint exists! (${response.status})`);
        if (response.ok) {
          const data = await response.json();
          console.log(`    Token received:`, Object.keys(data));
        }
      }
    } catch (error: any) {
      console.log(`    ❌ ${error.message}`);
    }
  }
}

testAPI()
  .then(() => {
    console.log("\n✅ Test complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
