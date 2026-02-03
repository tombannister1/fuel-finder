/**
 * Direct test of the Fuel Finder API with OAuth
 */

import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const CLIENT_ID = process.env.VITE_FUEL_FINDER_CLIENT_ID;
const CLIENT_SECRET = process.env.VITE_FUEL_FINDER_CLIENT_SECRET;
const TOKEN_URL = "https://www.fuel-finder.service.gov.uk/api/v1/oauth/generate_access_token";
const API_URL = "https://www.fuel-finder.service.gov.uk/api/v1/pfs/fuel-prices?batch-number=1";

async function testAPIWithOAuth() {
  console.log("🔍 Testing Fuel Finder API with OAuth...\n");
  
  // Step 1: Get access token
  console.log("Step 1: Getting access token...");
  console.log(`  Token URL: ${TOKEN_URL}`);
  console.log(`  Client ID: ${CLIENT_ID?.substring(0, 10)}...`);
  
  try {
    const tokenResponse = await fetch(TOKEN_URL, {
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

    console.log(`  Response Status: ${tokenResponse.status}`);
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.log(`  ❌ Token request failed!`);
      console.log(`  Error: ${errorText}`);
      return;
    }

    const tokenData = await tokenResponse.json();
    console.log(`  ✅ Token received!`);
    console.log(`  Token data keys:`, Object.keys(tokenData));
    
    // Token is nested in data.access_token
    const accessToken = tokenData.data?.access_token || tokenData.access_token;
    if (!accessToken) {
      console.log(`  ❌ No access_token in response!`);
      console.log(`  Response:`, tokenData);
      return;
    }
    
    console.log(`  Access Token: ${accessToken.substring(0, 30)}...`);

    // Step 2: Call API with token
    console.log("\nStep 2: Calling API with token...");
    console.log(`  API URL: ${API_URL}`);
    
    const apiResponse = await fetch(API_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    console.log(`  Response Status: ${apiResponse.status}`);
    console.log(`  Response Headers:`, Object.fromEntries(apiResponse.headers.entries()));

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.log(`  ❌ API request failed!`);
      console.log(`  Error Response: ${errorText}`);
      
      // Try to parse as JSON for better error details
      try {
        const errorJson = JSON.parse(errorText);
        console.log(`  Parsed Error:`, JSON.stringify(errorJson, null, 2));
      } catch {
        // Not JSON, already printed as text
      }
      return;
    }

    const data = await apiResponse.json();
    console.log(`  ✅ API call successful!`);
    console.log(`  Response keys:`, Object.keys(data));
    
    if (data.stations) {
      console.log(`  Stations found: ${data.stations.length}`);
    } else if (Array.isArray(data)) {
      console.log(`  Data is array with ${data.length} items`);
    } else {
      console.log(`  Full response:`, JSON.stringify(data, null, 2).substring(0, 500));
    }

  } catch (error) {
    console.error("❌ Unexpected error:", error);
  }
}

testAPIWithOAuth()
  .then(() => {
    console.log("\n✅ Test complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
