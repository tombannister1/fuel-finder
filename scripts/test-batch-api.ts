import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });

const CLIENT_ID = process.env.VITE_FUEL_FINDER_CLIENT_ID;
const CLIENT_SECRET = process.env.VITE_FUEL_FINDER_CLIENT_SECRET;
const API_URL = process.env.VITE_FUEL_FINDER_API_URL || "https://www.fuel-finder.service.gov.uk/api/v1";
const TOKEN_URL = process.env.VITE_FUEL_FINDER_TOKEN_URL || "https://www.fuel-finder.service.gov.uk/api/v1/oauth/generate_access_token";

async function testBatchAPI() {
  console.log("\n🔍 Testing Fuel Finder API with Batch Pagination\n");
  console.log("=" .repeat(60));
  
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error("❌ Missing CLIENT_ID or CLIENT_SECRET");
    process.exit(1);
  }

  try {
    // Step 1: Get OAuth token
    console.log("\n📝 Step 1: Getting OAuth Token");
    console.log("-".repeat(60));
    console.log(`Token URL: ${TOKEN_URL}`);
    
    const tokenResponse = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "client_credentials",
      }),
    });

    console.log(`Status: ${tokenResponse.status} ${tokenResponse.statusText}`);

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("❌ Token request failed:", errorText);
      process.exit(1);
    }

    const tokenData = await tokenResponse.json();
    const access_token = tokenData.data?.access_token || tokenData.access_token;
    
    if (!access_token) {
      console.error("❌ No access token in response:");
      console.log(JSON.stringify(tokenData, null, 2));
      process.exit(1);
    }

    console.log("✅ Token acquired successfully");
    console.log(`Token preview: ${access_token.substring(0, 20)}...`);

    // Step 2: Fetch batches
    console.log("\n📦 Step 2: Fetching Station Batches");
    console.log("-".repeat(60));

    let allStations: any[] = [];
    let batchNumber = 1;
    const maxBatches = 3; // Limit to 3 batches for testing

    while (batchNumber <= maxBatches) {
      console.log(`\n🔄 Batch ${batchNumber}:`);
      const apiEndpoint = `${API_URL}/pfs?batch-number=${batchNumber}`;
      console.log(`  URL: ${apiEndpoint}`);

      const startTime = Date.now();
      
      const response = await fetch(apiEndpoint, {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      const duration = Date.now() - startTime;
      console.log(`  Status: ${response.status} ${response.statusText}`);
      console.log(`  Duration: ${duration}ms`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`  ❌ Failed: ${errorText.substring(0, 200)}`);
        
        if (response.status === 504) {
          console.error(`\n⚠️  504 Timeout on batch ${batchNumber}`);
          console.log("\nTrying alternative endpoint /pfs/fuel-prices...");
          
          // Try alternative endpoint
          const altEndpoint = `${API_URL}/pfs/fuel-prices?batch-number=${batchNumber}`;
          console.log(`  URL: ${altEndpoint}`);
          
          const altResponse = await fetch(altEndpoint, {
            headers: {
              Authorization: `Bearer ${access_token}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
          });
          
          console.log(`  Status: ${altResponse.status} ${altResponse.statusText}`);
          
          if (!altResponse.ok) {
            console.error("  ❌ Alternative endpoint also failed");
          } else {
            const altData = await altResponse.json();
            console.log("  ✅ Alternative endpoint worked!");
            console.log(`  Response keys: ${Object.keys(altData).join(", ")}`);
          }
        }
        
        break;
      }

      const data = await response.json();
      
      // Log response structure
      console.log(`  Response type: ${typeof data}`);
      console.log(`  Response keys: ${Object.keys(data).join(", ")}`);

      // Try to find the stations array
      const stationsData = data.data || data.stations || data.pfs || data;
      
      if (Array.isArray(stationsData)) {
        const count = stationsData.length;
        console.log(`  ✅ Found ${count} stations`);
        
        if (count > 0) {
          const firstStation = stationsData[0];
          console.log(`  First station keys: ${Object.keys(firstStation).join(", ")}`);
          console.log(`  Sample station:`, JSON.stringify(firstStation, null, 2).substring(0, 300) + "...");
        }
        
        allStations = allStations.concat(stationsData);
        
        if (count === 0) {
          console.log("  ℹ️  Empty batch, stopping");
          break;
        } else if (count < 500) {
          console.log("  ℹ️  Last batch (< 500 stations)");
          break;
        }
      } else {
        console.log(`  ⚠️  Response is not an array`);
        console.log(`  Full response:`, JSON.stringify(data, null, 2).substring(0, 500));
        break;
      }

      batchNumber++;
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log(`📊 Summary:`);
    console.log(`  Total batches fetched: ${batchNumber}`);
    console.log(`  Total stations: ${allStations.length}`);
    console.log("=".repeat(60) + "\n");

  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  }
}

testBatchAPI();
