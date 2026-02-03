import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Convex functions for managing petrol stations
 */

// ============================================================================
// MUTATIONS (Write Operations)
// ============================================================================

/**
 * Upsert a station (create or update)
 */
export const upsertStation = mutation({
  args: {
    externalId: v.string(),
    name: v.string(),
    brand: v.optional(v.string()),
    addressLine1: v.string(),
    addressLine2: v.optional(v.string()),
    city: v.string(),
    county: v.optional(v.string()),
    postcode: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    amenities: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Check if station exists
    const existing = await ctx.db
      .query("stations")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
      .first();

    const now = Date.now();

    if (existing) {
      // Update existing station
      await ctx.db.patch(existing._id, {
        ...args,
        lastSyncedAt: now,
      });
      return existing._id;
    } else {
      // Create new station
      const id = await ctx.db.insert("stations", {
        ...args,
        lastSyncedAt: now,
      });
      return id;
    }
  },
});

/**
 * Batch upsert stations (for efficient bulk imports)
 */
export const batchUpsertStations = mutation({
  args: {
    stations: v.array(
      v.object({
        externalId: v.string(),
        name: v.string(),
        brand: v.optional(v.string()),
        addressLine1: v.string(),
        addressLine2: v.optional(v.string()),
        city: v.string(),
        county: v.optional(v.string()),
        postcode: v.string(),
        latitude: v.number(),
        longitude: v.number(),
        amenities: v.optional(v.array(v.string())),
      })
    ),
  },
  handler: async (ctx, args): Promise<string[]> => {
    const results: string[] = [];
    const now = Date.now();
    
    for (const station of args.stations) {
      // Inline the logic to avoid circular reference
      const existing = await ctx.db
        .query("stations")
        .withIndex("by_external_id", (q) => q.eq("externalId", station.externalId))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          ...station,
          lastSyncedAt: now,
        });
        results.push(existing._id);
      } else {
        const id = await ctx.db.insert("stations", {
          ...station,
          lastSyncedAt: now,
        });
        results.push(id);
      }
    }
    return results;
  },
});

// ============================================================================
// QUERIES (Read Operations)
// ============================================================================

/**
 * Search stations by postcode
 */
export const searchByPostcode = query({
  args: {
    postcode: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    
    // Normalize the postcode to standard format (e.g., "WF9 2WF")
    const normalizedPostcode = normalizePostcode(args.postcode);
    const outwardCode = normalizedPostcode.split(" ")[0];

    const stations = await ctx.db
      .query("stations")
      .withIndex("by_postcode")
      .filter((q) =>
        q.or(
          // Exact match on full postcode
          q.eq(q.field("postcode"), normalizedPostcode),
          // Match stations where postcode starts with the outward code
          q.and(
            q.gte(q.field("postcode"), outwardCode),
            q.lt(q.field("postcode"), outwardCode + "~") // "~" is after all alphanumeric chars
          )
        )
      )
      .take(limit);

    return stations;
  },
});

/**
 * Search stations by city/town name
 */
export const searchByCity = query({
  args: {
    city: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    
    // Normalize city name (uppercase for case-insensitive matching)
    const normalizedCity = args.city.trim().toUpperCase();

    const stations = await ctx.db
      .query("stations")
      .withIndex("by_city")
      .filter((q) =>
        // Case-insensitive partial match
        q.or(
          // Exact match
          q.eq(q.field("city"), normalizedCity),
          // Partial match (city field contains the search term)
          q.and(
            q.gte(q.field("city"), normalizedCity),
            q.lt(q.field("city"), normalizedCity + "~")
          )
        )
      )
      .take(limit);

    return stations;
  },
});

/**
 * Search stations by any location query (postcode, city, or address)
 * This is a unified search endpoint that handles:
 * - Full postcodes (e.g., "WF9 2WF")
 * - Partial postcodes (e.g., "WF9")
 * - Cities/towns (e.g., "London", "Pontefract")
 * - Addresses (e.g., "High Street")
 * - Station names (e.g., "Tesco", "Shell")
 */
export const searchByLocation = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    const searchQuery = args.query.trim().toUpperCase();
    
    // Normalize search query (remove spaces, hyphens, special chars)
    const normalizedSearchQuery = searchQuery.replace(/[\s\-]/g, '');
    
    // Fetch all stations (Convex handles this efficiently)
    const allStations = await ctx.db.query("stations").collect();
    
    const matchingStations = allStations
      .filter((station) => {
        // Get all searchable fields
        const city = station.city?.toUpperCase() || '';
        const county = station.county?.toUpperCase() || '';
        const postcode = station.postcode?.toUpperCase() || '';
        const address1 = station.addressLine1?.toUpperCase() || '';
        const address2 = station.addressLine2?.toUpperCase() || '';
        const name = station.name?.toUpperCase() || '';
        const brand = station.brand?.toUpperCase() || '';
        
        // Normalize postcode for flexible matching
        const normalizedPostcode = postcode.replace(/[\s\-]/g, '');
        
        // Extract postcode parts for partial matching
        // E.g., "WF9 2WF" -> outward: "WF9", inward: "2WF"
        const postcodeMatch = postcode.match(/^([A-Z]{1,2}\d{1,2}[A-Z]?)\s*(\d[A-Z]{2})?$/);
        const outwardCode = postcodeMatch ? postcodeMatch[1] : '';
        
        return (
          // City/town match
          city.includes(searchQuery) ||
          county.includes(searchQuery) ||
          
          // Full postcode match (with or without spaces)
          postcode.includes(searchQuery) ||
          normalizedPostcode.includes(normalizedSearchQuery) ||
          
          // Partial postcode match (outward code)
          outwardCode.includes(searchQuery) ||
          outwardCode.includes(normalizedSearchQuery) ||
          
          // Postcode starts with query (for partial searches)
          postcode.startsWith(searchQuery) ||
          normalizedPostcode.startsWith(normalizedSearchQuery) ||
          
          // Address match
          address1.includes(searchQuery) ||
          address2.includes(searchQuery) ||
          
          // Station name match
          name.includes(searchQuery) ||
          
          // Brand match
          brand.includes(searchQuery)
        );
      })
      .slice(0, limit);

    return matchingStations;
  },
});

/**
 * Get station by external ID
 */
export const getByExternalId = query({
  args: { externalId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("stations")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
      .first();
  },
});

/**
 * Get station IDs for a batch of external IDs
 * Returns externalId -> stationId for up to 500 IDs at a time
 */
export const getStationIdsBatch = query({
  args: { externalIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    const result: Record<string, string> = {};
    
    // Limit batch size
    const batchSize = Math.min(args.externalIds.length, 500);
    
    for (let i = 0; i < batchSize; i++) {
      const externalId = args.externalIds[i];
      const station = await ctx.db
        .query("stations")
        .withIndex("by_external_id", (q) => q.eq("externalId", externalId))
        .first();
      
      if (station) {
        result[externalId] = station._id;
      }
    }
    
    return result;
  },
});

/**
 * Get station by Convex ID
 */
export const getById = query({
  args: { id: v.id("stations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Get all stations (with pagination)
 */
export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100;
    return await ctx.db.query("stations").take(limit);
  },
});

/**
 * Search stations within a radius (approximate)
 * Note: For production, consider using a geospatial index or service
 */
export const searchByRadius = query({
  args: {
    latitude: v.number(),
    longitude: v.number(),
    radiusMiles: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100;
    
    // Get all stations
    const allStations = await ctx.db.query("stations").collect();

    // Calculate distances and filter
    const stationsWithDistance = allStations
      .map((station) => ({
        ...station,
        distance: calculateDistance(
          args.latitude,
          args.longitude,
          station.latitude,
          station.longitude
        ),
      }))
      .filter((station) => station.distance <= args.radiusMiles)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);

    return stationsWithDistance;
  },
});

/**
 * Get stations that haven't been synced recently
 */
export const getStaleStations = query({
  args: {
    olderThanMinutes: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const cutoffTime = Date.now() - args.olderThanMinutes * 60 * 1000;
    const limit = args.limit || 100;

    return await ctx.db
      .query("stations")
      .filter((q) => q.lt(q.field("lastSyncedAt"), cutoffTime))
      .take(limit);
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalizes a UK postcode to standard format (e.g., "WF9 2WF")
 * 
 * UK postcode format:
 * - Outward code (2-4 characters): area + district
 * - Space
 * - Inward code (3 characters): sector + unit
 * 
 * @example
 * normalizePostcode("wf92wf") // "WF9 2WF"
 * normalizePostcode("SW1A1AA") // "SW1A 1AA"
 * normalizePostcode("WF9 2WF") // "WF9 2WF" (already normalized)
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
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
