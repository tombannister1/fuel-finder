import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Convex Schema for Fuel Price Finder
 * 
 * Stores fuel price data with historical tracking
 */

export default defineSchema({
  // Petrol stations
  stations: defineTable({
    // Station identification
    externalId: v.string(), // ID from government API
    name: v.string(),
    brand: v.optional(v.string()),
    
    // Address
    addressLine1: v.string(),
    addressLine2: v.optional(v.string()),
    city: v.string(),
    county: v.optional(v.string()),
    postcode: v.string(),
    
    // Location
    latitude: v.number(),
    longitude: v.number(),
    
    // Metadata
    amenities: v.optional(v.array(v.string())),
    lastSyncedAt: v.number(), // Timestamp of last API sync
  })
    .index("by_external_id", ["externalId"])
    .index("by_postcode", ["postcode"])
    .index("by_city", ["city"])
    .index("by_location", ["latitude", "longitude"]),

  // Fuel prices (historical tracking)
  fuelPrices: defineTable({
    stationId: v.id("stations"), // Reference to station
    fuelType: v.union(
      v.literal("E5"),
      v.literal("E10"),
      v.literal("Diesel"),
      v.literal("Super Diesel"),
      v.literal("B10"),
      v.literal("HVO")
    ),
    price: v.number(), // Price in pence
    recordedAt: v.number(), // When this price was recorded
    sourceTimestamp: v.string(), // Original timestamp from API
  })
    .index("by_station", ["stationId"])
    .index("by_station_and_fuel", ["stationId", "fuelType"])
    .index("by_fuel_type", ["fuelType"])
    .index("by_recorded_at", ["recordedAt"])
    .index("by_station_fuel_time", ["stationId", "fuelType", "recordedAt"]),

  // Price alerts (user subscriptions)
  priceAlerts: defineTable({
    userId: v.optional(v.string()), // Optional user ID for multi-user support
    stationId: v.id("stations"),
    fuelType: v.union(
      v.literal("E5"),
      v.literal("E10"),
      v.literal("Diesel"),
      v.literal("Super Diesel"),
      v.literal("B10"),
      v.literal("HVO")
    ),
    targetPrice: v.number(), // Alert when price drops below this
    isActive: v.boolean(),
    createdAt: v.number(),
    lastAlertedAt: v.optional(v.number()),
  })
    .index("by_station", ["stationId"])
    .index("by_active", ["isActive"]),

  // Sync log (track API sync operations)
  syncLog: defineTable({
    syncType: v.union(
      v.literal("stations"),   // Full station data sync (from getPFSInfo)
      v.literal("prices"),     // Price-only sync (from getIncrementalPFSFuelPrices)
      v.literal("full"),       // Legacy: Full data sync
      v.literal("incremental"),// Legacy: Incremental update
      v.literal("postcode")    // Postcode-specific sync
    ),
    status: v.union(
      v.literal("started"),
      v.literal("completed"),
      v.literal("failed")
    ),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    stationsProcessed: v.optional(v.number()),
    pricesProcessed: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    metadata: v.optional(v.any()), // Additional context (e.g., postcode searched, last sync timestamp)
  })
    .index("by_status", ["status"])
    .index("by_started_at", ["startedAt"])
    .index("by_type_and_status", ["syncType", "status"]),

  // Sync state (track last successful sync timestamps)
  syncState: defineTable({
    key: v.string(), // e.g., "last_station_sync", "last_price_sync"
    value: v.string(), // Timestamp or other state data
    updatedAt: v.number(),
  }).index("by_key", ["key"]),
});
