import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

/**
 * React hooks for Convex-powered fuel finder
 * 
 * These hooks provide real-time access to fuel price data with historical tracking
 */

/**
 * Search stations by postcode with current prices
 */
export function useStationsByPostcode(postcode: string | null, limit?: number) {
  const stations = useQuery(
    api.stations.searchByPostcode,
    postcode ? { postcode, limit } : "skip"
  );

  return stations;
}

/**
 * Search stations by city/town name
 */
export function useStationsByCity(city: string | null, limit?: number) {
  const stations = useQuery(
    api.stations.searchByCity,
    city ? { city, limit } : "skip"
  );

  return stations;
}

/**
 * Search stations by any location query (unified search)
 */
export function useStationsByLocation(query: string | null, limit?: number) {
  const stations = useQuery(
    api.stations.searchByLocation,
    query ? { query, limit } : "skip"
  );

  return stations;
}

/**
 * Search stations by radius
 */
export function useStationsByRadius(
  latitude: number | null,
  longitude: number | null,
  radiusMiles: number,
  limit?: number
) {
  const stations = useQuery(
    api.stations.searchByRadius,
    latitude !== null && longitude !== null
      ? { latitude, longitude, radiusMiles, limit }
      : "skip"
  );

  return stations;
}

/**
 * Get current prices for a station
 */
export function useCurrentPrices(stationId: Id<"stations"> | null) {
  const prices = useQuery(
    api.fuelPrices.getCurrentPrices,
    stationId ? { stationId } : "skip"
  );

  return prices;
}

/**
 * Get price history for a station and fuel type
 */
export function usePriceHistory(
  stationId: Id<"stations"> | null,
  fuelType: "E5" | "E10" | "Diesel" | "Super Diesel" | "B10" | "HVO" | null,
  daysBack?: number
) {
  const history = useQuery(
    api.fuelPrices.getPriceHistory,
    stationId && fuelType ? { stationId, fuelType, daysBack } : "skip"
  );

  return history;
}

/**
 * Get cheapest prices for a fuel type
 */
export function useCheapestPrices(
  fuelType: "E5" | "E10" | "Diesel" | "Super Diesel" | "B10" | "HVO" | null,
  limit?: number
) {
  const prices = useQuery(
    api.fuelPrices.getCheapestPrices,
    fuelType ? { fuelType, limit } : "skip"
  );

  return prices;
}

/**
 * Get recent price changes
 */
export function useRecentPriceChanges(hoursBack?: number, limit?: number) {
  const changes = useQuery(api.fuelPrices.getRecentPriceChanges, {
    hoursBack,
    limit,
  });

  return changes;
}

/**
 * Get price statistics for a fuel type
 */
export function usePriceStats(
  fuelType: "E5" | "E10" | "Diesel" | "Super Diesel" | "B10" | "HVO" | null,
  daysBack?: number
) {
  const stats = useQuery(
    api.fuelPrices.getPriceStats,
    fuelType ? { fuelType, daysBack } : "skip"
  );

  return stats;
}

/**
 * Sync action to fetch data from API
 */
export function useSyncByPostcode() {
  const syncAction = useAction(api.sync.syncByPostcode);

  return async (
    postcode: string,
    options?: { radius?: number; fuelType?: string }
  ) => {
    return await syncAction({
      postcode,
      radius: options?.radius,
      fuelType: options?.fuelType,
    });
  };
}

/**
 * Full sync action
 */
export function useFullSync() {
  const syncAction = useAction(api.sync.fullSync);

  return async () => {
    return await syncAction({});
  };
}

/**
 * Combined hook for search with auto-sync
 * Searches local data first, then syncs from API if needed
 */
export function useSmartSearch(
  postcode: string | null,
  options?: {
    radius?: number;
    fuelType?: string;
    autoSync?: boolean;
  }
) {
  const stations = useStationsByPostcode(postcode, 50);
  const syncByPostcode = useSyncByPostcode();

  const search = async () => {
    if (!postcode) return;

    // Check if we have recent data
    if (!stations || stations.length === 0 || options?.autoSync) {
      // Sync from API
      await syncByPostcode(postcode, {
        radius: options?.radius,
        fuelType: options?.fuelType,
      });
    }
  };

  return {
    stations,
    search,
    isLoading: stations === undefined,
    hasData: stations && stations.length > 0,
  };
}
