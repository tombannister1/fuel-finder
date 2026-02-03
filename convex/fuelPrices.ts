import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Convex functions for managing fuel prices with historical tracking
 */

// ============================================================================
// MUTATIONS (Write Operations)
// ============================================================================

/**
 * Add a new fuel price record
 */
export const addPrice = mutation({
  args: {
    stationId: v.id("stations"),
    fuelType: v.union(
      v.literal("E5"),
      v.literal("E10"),
      v.literal("Diesel"),
      v.literal("Super Diesel"),
      v.literal("B10"),
      v.literal("HVO")
    ),
    price: v.number(),
    sourceTimestamp: v.string(),
  },
  handler: async (ctx, args) => {
    const recordedAt = Date.now();

    // Check if we already have this exact price
    const existing = await ctx.db
      .query("fuelPrices")
      .withIndex("by_station_fuel_time", (q) =>
        q.eq("stationId", args.stationId).eq("fuelType", args.fuelType)
      )
      .order("desc")
      .first();

    // Only insert if price changed or it's been more than 1 hour
    if (
      !existing ||
      existing.price !== args.price ||
      recordedAt - existing.recordedAt > 60 * 60 * 1000
    ) {
      return await ctx.db.insert("fuelPrices", {
        ...args,
        recordedAt,
      });
    }

    return existing._id;
  },
});

/**
 * Batch add fuel prices (for efficient bulk imports)
 */
export const batchAddPrices = mutation({
  args: {
    prices: v.array(
      v.object({
        stationId: v.id("stations"),
        fuelType: v.union(
          v.literal("E5"),
          v.literal("E10"),
          v.literal("Diesel"),
          v.literal("Super Diesel"),
          v.literal("B10"),
          v.literal("HVO")
        ),
        price: v.number(),
        sourceTimestamp: v.string(),
      })
    ),
  },
  handler: async (ctx, args): Promise<string[]> => {
    const results: string[] = [];
    for (const price of args.prices) {
      const recordedAt = Date.now();

      // Inline the logic to avoid circular reference
      const existing = await ctx.db
        .query("fuelPrices")
        .withIndex("by_station_fuel_time", (q) =>
          q.eq("stationId", price.stationId).eq("fuelType", price.fuelType)
        )
        .order("desc")
        .first();

      if (
        !existing ||
        existing.price !== price.price ||
        recordedAt - existing.recordedAt > 60 * 60 * 1000
      ) {
        const id = await ctx.db.insert("fuelPrices", {
          ...price,
          recordedAt,
        });
        results.push(id);
      } else {
        results.push(existing._id);
      }
    }
    return results;
  },
});

// ============================================================================
// QUERIES (Read Operations)
// ============================================================================

/**
 * Get current prices for a station (most recent for each fuel type)
 */
export const getCurrentPrices = query({
  args: { stationId: v.id("stations") },
  handler: async (ctx, args) => {
    const allPrices = await ctx.db
      .query("fuelPrices")
      .withIndex("by_station", (q) => q.eq("stationId", args.stationId))
      .collect();

    // Group by fuel type and get most recent
    const currentPrices: Record<string, any> = {};
    for (const price of allPrices) {
      if (
        !currentPrices[price.fuelType] ||
        price.recordedAt > currentPrices[price.fuelType].recordedAt
      ) {
        currentPrices[price.fuelType] = price;
      }
    }

    return Object.values(currentPrices);
  },
});

/**
 * Get price history for a station and fuel type
 */
export const getPriceHistory = query({
  args: {
    stationId: v.id("stations"),
    fuelType: v.union(
      v.literal("E5"),
      v.literal("E10"),
      v.literal("Diesel"),
      v.literal("Super Diesel"),
      v.literal("B10"),
      v.literal("HVO")
    ),
    daysBack: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const daysBack = args.daysBack || 30;
    const cutoffTime = Date.now() - daysBack * 24 * 60 * 60 * 1000;

    return await ctx.db
      .query("fuelPrices")
      .withIndex("by_station_fuel_time", (q) =>
        q.eq("stationId", args.stationId).eq("fuelType", args.fuelType)
      )
      .filter((q) => q.gte(q.field("recordedAt"), cutoffTime))
      .order("desc")
      .collect();
  },
});

/**
 * Get cheapest prices by fuel type
 */
export const getCheapestPrices = query({
  args: {
    fuelType: v.union(
      v.literal("E5"),
      v.literal("E10"),
      v.literal("Diesel"),
      v.literal("Super Diesel"),
      v.literal("B10"),
      v.literal("HVO")
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;

    // Get recent prices for this fuel type
    const recentCutoff = Date.now() - 24 * 60 * 60 * 1000; // Last 24 hours

    const prices = await ctx.db
      .query("fuelPrices")
      .withIndex("by_fuel_type", (q) => q.eq("fuelType", args.fuelType))
      .filter((q) => q.gte(q.field("recordedAt"), recentCutoff))
      .collect();

    // Group by station and get most recent price
    const stationPrices = new Map();
    for (const price of prices) {
      const existing = stationPrices.get(price.stationId.toString());
      if (!existing || price.recordedAt > existing.recordedAt) {
        stationPrices.set(price.stationId.toString(), price);
      }
    }

    // Sort by price and get cheapest
    return Array.from(stationPrices.values())
      .sort((a, b) => a.price - b.price)
      .slice(0, limit);
  },
});

/**
 * Get stations with recent price changes
 */
export const getRecentPriceChanges = query({
  args: {
    hoursBack: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const hoursBack = args.hoursBack || 24;
    const limit = args.limit || 50;
    const cutoffTime = Date.now() - hoursBack * 60 * 60 * 1000;

    return await ctx.db
      .query("fuelPrices")
      .withIndex("by_recorded_at", (q) => q.gte("recordedAt", cutoffTime))
      .order("desc")
      .take(limit);
  },
});

/**
 * Get price statistics for a fuel type
 */
export const getPriceStats = query({
  args: {
    fuelType: v.union(
      v.literal("E5"),
      v.literal("E10"),
      v.literal("Diesel"),
      v.literal("Super Diesel"),
      v.literal("B10"),
      v.literal("HVO")
    ),
    daysBack: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const daysBack = args.daysBack || 7;
    const cutoffTime = Date.now() - daysBack * 24 * 60 * 60 * 1000;

    const prices = await ctx.db
      .query("fuelPrices")
      .withIndex("by_fuel_type", (q) => q.eq("fuelType", args.fuelType))
      .filter((q) => q.gte(q.field("recordedAt"), cutoffTime))
      .collect();

    if (prices.length === 0) {
      return null;
    }

    // Calculate statistics
    const priceValues = prices.map((p) => p.price);
    const min = Math.min(...priceValues);
    const max = Math.max(...priceValues);
    const avg = priceValues.reduce((a, b) => a + b, 0) / priceValues.length;

    // Calculate median
    const sorted = [...priceValues].sort((a, b) => a - b);
    const median =
      sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];

    return {
      fuelType: args.fuelType,
      count: prices.length,
      min,
      max,
      avg,
      median,
      daysBack,
    };
  },
});
