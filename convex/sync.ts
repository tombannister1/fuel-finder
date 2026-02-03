import { v } from "convex/values";
import { action, internalMutation, query } from "./_generated/server";
import { api, internal } from "./_generated/api";

/**
 * Sync service to fetch data from Fuel Finder API and store in Convex
 * 
 * Two-endpoint approach:
 * 1. getPFSInfo - Fetches all station metadata (run weekly)
 * 2. getIncrementalPFSFuelPrices - Fetches price updates (run frequently)
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

/**
 * Get OAuth access token
 */
async function getAccessToken(): Promise<string> {
  const clientId = process.env.FUEL_FINDER_CLIENT_ID;
  const clientSecret = process.env.FUEL_FINDER_CLIENT_SECRET;
  const tokenUrl = process.env.FUEL_FINDER_TOKEN_URL ||
    "https://auth.fuel-finder.service.gov.uk/oauth2/token";

  if (!clientId || !clientSecret) {
    throw new Error("OAuth credentials not configured on Convex backend");
  }

  console.log(`Requesting OAuth token from: ${tokenUrl}`);
  console.log(`Using client ID: ${clientId?.substring(0, 10)}...`);
  
  const tokenResponse = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
      "User-Agent": "FuelFinder/1.0",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  console.log(`OAuth response status: ${tokenResponse.status}`);
  
  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error(`OAuth error body: ${errorText}`);
    throw new Error(`OAuth failed: ${tokenResponse.status} - ${errorText}`);
  }

  const tokenData = await tokenResponse.json();
  const access_token = tokenData.data?.access_token || tokenData.access_token;
  
  if (!access_token) {
    throw new Error(`No access token in response: ${JSON.stringify(tokenData)}`);
  }

  return access_token;
}

// ============================================================================
// ACTIONS (Can make external API calls)
// ============================================================================

/**
 * Sync all station information (metadata only, no prices)
 * Use: Run weekly or when you need to update station details
 * Endpoint: getPFSInfo
 */
export const syncStations = action({
  args: {},
  handler: async (ctx) => {
    const syncId = await ctx.runMutation(internal.sync.startSync, {
      syncType: "stations",
      metadata: { endpoint: "getPFSInfo" },
    });

    try {
      console.log("🏪 Starting station metadata sync...");
      
      const accessToken = await getAccessToken();
      const apiUrl = process.env.FUEL_FINDER_API_URL || 
        "https://www.fuel-finder.service.gov.uk/api/v1";

      // Fetch all stations using getPFSInfo endpoint
      let allStationsData: any[] = [];
      let batchNumber = 1;
      let hasMoreBatches = true;
      
      console.log("📥 Fetching station data in batches...");
      
      while (hasMoreBatches) {
        console.log(`  Batch ${batchNumber}...`);
        
        // getPFSInfo endpoint - returns station metadata
        const apiEndpoint = `${apiUrl}/pfs?batch-number=${batchNumber}`;
        const response = await fetch(apiEndpoint, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API request failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const stationsData = data.data || data.stations || data;
        
        if (!Array.isArray(stationsData)) {
          throw new Error("Invalid API response format - no stations array found");
        }

        const batchSize = stationsData.length;
        console.log(`    ✅ ${batchSize} stations`);
        
        if (batchSize === 0) {
          hasMoreBatches = false;
        } else {
          allStationsData = allStationsData.concat(stationsData);
          
          // Batch size of 500 indicates more data available
          if (batchSize < 500) {
            hasMoreBatches = false;
          } else {
            batchNumber++;
          }
        }
      }

      console.log(`\n📊 Total stations fetched: ${allStationsData.length}`);
      console.log("💾 Saving to database...\n");

      let stationsProcessed = 0;
      
      // Process stations in batches for efficiency
      const BATCH_SIZE = 50;
      for (let i = 0; i < allStationsData.length; i += BATCH_SIZE) {
        const batch = allStationsData.slice(i, i + BATCH_SIZE);
        const stationsToUpsert = batch.map((station) => {
          // Map API fields to our schema
          const stationName = station.station_name || station.name || station.site_name || 'Unknown Station';
          const stationId = station.station_id || station.id || station.site_id || `unknown_${i}`;
          const brandName = station.brand || station.station_brand || station.site_brand;
          const rawPostcode = station.address?.postcode || station.postcode || '';
          
          return {
            externalId: String(stationId),
            name: stationName,
            brand: brandName,
            addressLine1: station.address?.line1 || station.address || 'Unknown',
            addressLine2: station.address?.line2,
            city: station.address?.city || station.city || 'Unknown',
            county: station.address?.county || station.county,
            postcode: normalizePostcode(rawPostcode),
            latitude: station.location?.latitude || station.latitude || 0,
            longitude: station.location?.longitude || station.longitude || 0,
            amenities: station.amenities,
          };
        });

        await ctx.runMutation(api.stations.batchUpsertStations, {
          stations: stationsToUpsert,
        });

        stationsProcessed += batch.length;
        if (stationsProcessed % 100 === 0 || stationsProcessed === allStationsData.length) {
          console.log(`  Progress: ${stationsProcessed}/${allStationsData.length} stations`);
        }
      }

      // Record last sync timestamp
      await ctx.runMutation(internal.sync.setSyncState, {
        key: "last_station_sync",
        value: new Date().toISOString(),
      });

      console.log(`\n✅ Station sync complete: ${stationsProcessed} stations`);

      await ctx.runMutation(internal.sync.completeSync, {
        syncId,
        stationsProcessed,
        pricesProcessed: 0,
      });

      return {
        success: true,
        stationsProcessed,
        message: "Station metadata synced successfully",
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

/**
 * Sync incremental price updates only
 * Use: Run frequently (every 30 minutes to hourly)
 * Endpoint: getIncrementalPFSFuelPrices
 */
export const syncPrices = action({
  args: {
    sinceTimestamp: v.optional(v.string()), // ISO timestamp to fetch changes since
  },
  handler: async (ctx, args) => {
    const syncId = await ctx.runMutation(internal.sync.startSync, {
      syncType: "prices",
      metadata: { endpoint: "getIncrementalPFSFuelPrices", since: args.sinceTimestamp },
    });

    try {
      console.log("⛽ Starting incremental price sync...");
      
      const accessToken = await getAccessToken();
      const apiUrl = process.env.FUEL_FINDER_API_URL || 
        "https://www.fuel-finder.service.gov.uk/api/v1";

      // Get last sync timestamp if not provided
      let sinceTimestamp = args.sinceTimestamp;
      if (!sinceTimestamp) {
        const lastSync = await ctx.runQuery(api.sync.getSyncStateInternal, {
          key: "last_price_sync",
        });
        sinceTimestamp = lastSync?.value || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Default: 24 hours ago
      }

      console.log(`📅 Fetching prices changed since: ${sinceTimestamp}`);

      // Fetch incremental price updates
      let allPriceUpdates: any[] = [];
      let batchNumber = 1;
      let hasMoreBatches = true;

      while (hasMoreBatches) {
        console.log(`  Batch ${batchNumber}...`);
        
        // getIncrementalPFSFuelPrices endpoint
        // Query params: since (timestamp), batch-number
        const url = new URL(`${apiUrl}/pfs/fuel-prices`);
        url.searchParams.set("since", sinceTimestamp);
        url.searchParams.set("batch-number", String(batchNumber));
        
        const response = await fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API request failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const priceData = data.data || data.prices || data;
        
        if (!Array.isArray(priceData)) {
          throw new Error("Invalid API response format - no prices array found");
        }

        const batchSize = priceData.length;
        console.log(`    ✅ ${batchSize} price updates`);
        
        if (batchSize === 0) {
          hasMoreBatches = false;
        } else {
          allPriceUpdates = allPriceUpdates.concat(priceData);
          
          if (batchSize < 500) {
            hasMoreBatches = false;
          } else {
            batchNumber++;
          }
        }
      }

      console.log(`\n📊 Total price updates: ${allPriceUpdates.length}`);
      console.log("💾 Saving to database...\n");

      let pricesProcessed = 0;
      let stationsNotFound = 0;

      // Process prices
      for (const priceUpdate of allPriceUpdates) {
        // Map API fields
        const stationExternalId = priceUpdate.station_id || priceUpdate.stationId || priceUpdate.pfs_id;
        const fuelTypeRaw = priceUpdate.fuel_type || priceUpdate.fuelType;
        const priceValue = priceUpdate.price;
        const timestamp = priceUpdate.last_updated || priceUpdate.lastUpdated || priceUpdate.timestamp || new Date().toISOString();

        if (!stationExternalId || !fuelTypeRaw || !priceValue) {
          continue; // Skip invalid entries
        }

        // Find station by external ID
        const station = await ctx.runQuery(api.stations.getByExternalId, {
          externalId: String(stationExternalId),
        });

        if (!station) {
          stationsNotFound++;
          continue; // Station not in our DB yet - need to run syncStations first
        }

        // Map fuel type names (API might use different names)
        let fuelType = fuelTypeRaw;
        if (fuelTypeRaw === "B7P" || fuelTypeRaw === "Diesel (B7)") fuelType = "Diesel";
        if (fuelTypeRaw === "B7S" || fuelTypeRaw === "Super Diesel (B7)") fuelType = "Super Diesel";

        // Validate fuel type
        const validFuelTypes = ["E5", "E10", "Diesel", "Super Diesel", "B10", "HVO"];
        if (!validFuelTypes.includes(fuelType)) {
          continue; // Skip unknown fuel types
        }

        await ctx.runMutation(api.fuelPrices.addPrice, {
          stationId: station._id,
          fuelType: fuelType as any,
          price: Math.round(typeof priceValue === 'string' ? parseFloat(priceValue) : priceValue),
          sourceTimestamp: timestamp,
        });

        pricesProcessed++;

        if (pricesProcessed % 100 === 0) {
          console.log(`  Progress: ${pricesProcessed}/${allPriceUpdates.length} prices`);
        }
      }

      // Record last sync timestamp
      await ctx.runMutation(internal.sync.setSyncState, {
        key: "last_price_sync",
        value: new Date().toISOString(),
      });

      console.log(`\n✅ Price sync complete: ${pricesProcessed} prices updated`);
      if (stationsNotFound > 0) {
        console.log(`⚠️  ${stationsNotFound} prices skipped (stations not found)`);
      }

      await ctx.runMutation(internal.sync.completeSync, {
        syncId,
        stationsProcessed: 0,
        pricesProcessed,
      });

      return {
        success: true,
        pricesProcessed,
        stationsNotFound,
        message: "Price data synced successfully",
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
      v.literal("stations"),
      v.literal("prices"),
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

export const setSyncState = internalMutation({
  args: {
    key: v.string(),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("syncState")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("syncState", {
        key: args.key,
        value: args.value,
        updatedAt: Date.now(),
      });
    }
  },
});

export const getSyncStateInternal = query({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("syncState")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
  },
});

// ============================================================================
// PUBLIC QUERIES (Monitoring)
// ============================================================================

/**
 * Get recent sync logs
 */
export const getRecentSyncs = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    return await ctx.db
      .query("syncLog")
      .withIndex("by_started_at")
      .order("desc")
      .take(limit);
  },
});

/**
 * Get last successful sync by type
 */
export const getLastSuccessfulSync = query({
  args: {
    syncType: v.union(
      v.literal("stations"),
      v.literal("prices")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("syncLog")
      .withIndex("by_type_and_status", (q) => 
        q.eq("syncType", args.syncType).eq("status", "completed")
      )
      .order("desc")
      .first();
  },
});
