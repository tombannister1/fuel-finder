import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";

/**
 * Sync service to fetch data from Fuel Finder API and store in Convex
 * 
 * This runs as a Convex action which can make external API calls
 */

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalizes a UK postcode to standard format (e.g., "WF9 2WF")
 */
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

// ============================================================================
// ACTIONS (Can make external API calls)
// ============================================================================

/**
 * Sync fuel prices for a specific postcode
 */
export const syncByPostcode = action({
  args: {
    postcode: v.string(),
    radius: v.optional(v.number()),
    fuelType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const syncId = await ctx.runMutation(internal.sync.startSync, {
      syncType: "postcode",
      metadata: { postcode: args.postcode, radius: args.radius },
    });

    try {
      // Fetch OAuth credentials from environment
      const clientId = process.env.FUEL_FINDER_CLIENT_ID;
      const clientSecret = process.env.FUEL_FINDER_CLIENT_SECRET;
      const apiUrl = process.env.FUEL_FINDER_API_URL || 
        "https://api.fuel-finder.service.gov.uk/v1";
      const tokenUrl = process.env.FUEL_FINDER_TOKEN_URL ||
        "https://auth.fuel-finder.service.gov.uk/oauth2/token";

      if (!clientId || !clientSecret) {
        throw new Error("OAuth credentials not configured on Convex backend");
      }

      // Get OAuth token
      const tokenResponse = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
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
      // Token is nested in data.access_token
      const access_token = tokenData.data?.access_token || tokenData.access_token;
      
      if (!access_token) {
        throw new Error(`No access token in response: ${JSON.stringify(tokenData)}`);
      }

      // Fetch PFS (Petrol Fuel Station) data in batches (500 stations per batch)
      let allStationsData: any[] = [];
      let batchNumber = 1;
      let hasMoreBatches = true;
      
      console.log("Starting batch fetching...");
      
      while (hasMoreBatches) {
        console.log(`Fetching batch ${batchNumber}...`);
        
        const apiEndpoint = `${apiUrl}/pfs?batch-number=${batchNumber}`;
        const response = await fetch(apiEndpoint, {
          headers: {
            Authorization: `Bearer ${access_token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        });

        console.log(`  Response Status: ${response.status}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.log(`  API Error: ${errorText}`);
          throw new Error(`API request failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        
        // The API might return different formats, handle both
        const stationsData = data.data || data.stations || data;
        
        if (!stationsData || !Array.isArray(stationsData)) {
          console.log("Response structure:", JSON.stringify(data).substring(0, 200));
          throw new Error("Invalid API response format - no stations array found");
        }

        const batchStations = stationsData.length;
        console.log(`  ✅ Fetched ${batchStations} stations from batch ${batchNumber}`);
        
        if (batchStations === 0) {
          // No more stations, stop fetching
          hasMoreBatches = false;
          console.log("No more batches to fetch");
        } else {
          allStationsData = allStationsData.concat(stationsData);
          
          // If we got less than 500, this is probably the last batch
          if (batchStations < 500) {
            hasMoreBatches = false;
            console.log("Last batch detected (< 500 stations)");
          } else {
            batchNumber++;
          }
        }
      }

      const totalStations = allStationsData.length;
      console.log(`\n📊 Total stations fetched: ${totalStations} across ${batchNumber} batch(es)\n`);

      let stationsProcessed = 0;
      let pricesProcessed = 0;

      console.log("Starting to process stations...\n");
      
      // Process each station  
      for (const station of allStationsData) {
        console.log(`Processing station ${stationsProcessed + 1}/${totalStations}: ${station.station_name || station.name || station.id}`);

        // Handle different field names the API might use
        const stationName = station.station_name || station.name || station.site_name || 'Unknown Station';
        const stationId = station.station_id || station.id || station.site_id;
        const brandName = station.brand || station.station_brand || station.site_brand;
        
        // Upsert station with normalized postcode
        const rawPostcode = station.address?.postcode || station.postcode || '';
        const convexStationId = await ctx.runMutation(api.stations.upsertStation, {
          externalId: stationId,
          name: stationName,
          brand: brandName,
          addressLine1: station.address?.line1 || station.address || '',
          addressLine2: station.address?.line2,
          city: station.address?.city || station.city || '',
          county: station.address?.county || station.county,
          postcode: normalizePostcode(rawPostcode),
          latitude: station.location?.latitude || station.latitude || 0,
          longitude: station.location?.longitude || station.longitude || 0,
          amenities: station.amenities,
        });

        stationsProcessed++;

        // Add fuel prices if available
        const prices = station.fuel_prices || station.fuelPrices || station.prices || [];
        for (const price of prices) {
          const fuelType = price.fuel_type || price.fuelType;
          const priceValue = price.price;
          const timestamp = price.last_updated || price.lastUpdated || new Date().toISOString();
          
          if (fuelType && priceValue) {
            await ctx.runMutation(api.fuelPrices.addPrice, {
              stationId: convexStationId,
              fuelType: fuelType,
              price: Math.round(priceValue),
              sourceTimestamp: timestamp,
            });
            pricesProcessed++;
          }
        }
        
        if (stationsProcessed % 10 === 0) {
          console.log(`Progress: ${stationsProcessed}/${totalStations} stations, ${pricesProcessed} prices`);
        }
      }

      console.log(`✅ All stations processed: ${stationsProcessed} stations, ${pricesProcessed} prices`);

      // Mark sync as completed
      await ctx.runMutation(internal.sync.completeSync, {
        syncId,
        stationsProcessed,
        pricesProcessed,
      });

      return {
        success: true,
        stationsProcessed,
        pricesProcessed,
      };
    } catch (error) {
      // Mark sync as failed
      await ctx.runMutation(internal.sync.failSync, {
        syncId,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * Full sync of all available data
 */
export const fullSync = action({
  args: {},
  handler: async (ctx) => {
    const syncId = await ctx.runMutation(internal.sync.startSync, {
      syncType: "full",
      metadata: {},
    });

    try {
      // Similar to syncByPostcode but without postcode filter
      const clientId = process.env.FUEL_FINDER_CLIENT_ID;
      const clientSecret = process.env.FUEL_FINDER_CLIENT_SECRET;
      const apiUrl = process.env.FUEL_FINDER_API_URL || 
        "https://www.fuel-finder.service.gov.uk/api/v1";
      const tokenUrl = process.env.FUEL_FINDER_TOKEN_URL ||
        "https://www.fuel-finder.service.gov.uk/api/v1/oauth/generate_access_token";

      if (!clientId || !clientSecret) {
        throw new Error("OAuth credentials not configured on Convex backend");
      }

      // Get OAuth token
      const tokenResponse = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
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
      // Token is nested in data.access_token
      const access_token = tokenData.data?.access_token || tokenData.access_token;
      
      if (!access_token) {
        throw new Error(`No access token in response: ${JSON.stringify(tokenData)}`);
      }

      // Fetch all stations (using batch-number for pagination)
      // Start with batch 1, returns up to 500 stations
      const response = await fetch(`${apiUrl}/pfs?batch-number=1`, {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success || !data.data) {
        throw new Error("Invalid API response format");
      }

      let stationsProcessed = 0;
      let pricesProcessed = 0;

      for (const station of data.data) {
        const stationId = await ctx.runMutation(api.stations.upsertStation, {
          externalId: station.id,
          name: station.name,
          brand: station.brand,
          addressLine1: station.address.line1,
          addressLine2: station.address.line2,
          city: station.address.city,
          county: station.address.county,
          postcode: normalizePostcode(station.address.postcode),
          latitude: station.location.latitude,
          longitude: station.location.longitude,
          amenities: station.amenities,
        });

        stationsProcessed++;

        for (const price of station.fuelPrices) {
          await ctx.runMutation(api.fuelPrices.addPrice, {
            stationId,
            fuelType: price.fuelType,
            price: price.price,
            sourceTimestamp: price.lastUpdated,
          });
          pricesProcessed++;
        }
      }

      await ctx.runMutation(internal.sync.completeSync, {
        syncId,
        stationsProcessed,
        pricesProcessed,
      });

      return {
        success: true,
        stationsProcessed,
        pricesProcessed,
      };
    } catch (error) {
      await ctx.runMutation(internal.sync.failSync, {
        syncId,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// ============================================================================
// INTERNAL MUTATIONS (Sync tracking)
// ============================================================================

export const startSync = internalMutation({
  args: {
    syncType: v.union(
      v.literal("full"),
      v.literal("incremental"),
      v.literal("postcode")
    ),
    metadata: v.any(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("syncLog", {
      syncType: args.syncType,
      status: "started",
      startedAt: Date.now(),
      metadata: args.metadata,
    });
  },
});

export const completeSync = internalMutation({
  args: {
    syncId: v.id("syncLog"),
    stationsProcessed: v.number(),
    pricesProcessed: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.syncId, {
      status: "completed",
      completedAt: Date.now(),
      stationsProcessed: args.stationsProcessed,
      pricesProcessed: args.pricesProcessed,
    });
  },
});

export const failSync = internalMutation({
  args: {
    syncId: v.id("syncLog"),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.syncId, {
      status: "failed",
      completedAt: Date.now(),
      errorMessage: args.errorMessage,
    });
  },
});
