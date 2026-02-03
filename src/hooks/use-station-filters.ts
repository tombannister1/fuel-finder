import { useState, useMemo } from 'react';

export interface StationFilters {
  brands: string[];
  maxPrice?: number;
  minPrice?: number;
  maxDistance?: number;
  hasFuelType?: string[];
  showOnlyOpen?: boolean;
  hideNoPrices?: boolean;
  hideIncompleteData?: boolean;
}

interface Station {
  _id: string;
  brand?: string;
  distance: number;
  [key: string]: any;
}

interface PriceInfo {
  fuelType: string;
  price: number;
  [key: string]: any;
}

/**
 * Hook to manage station filtering
 */
export function useStationFilters(
  stations: Station[],
  prices: Map<string, PriceInfo[]>, // Map of stationId to prices
  selectedFuelType: string
) {
  const [filters, setFilters] = useState<StationFilters>({
    brands: [],
    maxPrice: undefined,
    minPrice: undefined,
    maxDistance: undefined,
    hasFuelType: [],
    hideNoPrices: false, // Not used in filtering, handled at component level
    hideIncompleteData: true, // Default to hiding incomplete data
  });

  // Get unique brands from stations
  const availableBrands = useMemo(() => {
    const brands = new Set<string>();
    stations.forEach(station => {
      if (station.brand) {
        brands.add(station.brand);
      }
    });
    return Array.from(brands).sort();
  }, [stations]);

  // Get price range for selected fuel type
  const priceRange = useMemo(() => {
    const pricesForFuelType: number[] = [];
    
    prices.forEach(stationPrices => {
      const fuelPrice = stationPrices.find(p => p.fuelType === selectedFuelType);
      if (fuelPrice) {
        pricesForFuelType.push(fuelPrice.price);
      }
    });

    if (pricesForFuelType.length === 0) {
      return { min: 0, max: 0 };
    }

    return {
      min: Math.min(...pricesForFuelType),
      max: Math.max(...pricesForFuelType),
    };
  }, [prices, selectedFuelType]);

  // Filter stations based on current filters
  const filteredStations = useMemo(() => {
    return stations.filter(station => {
      // Data quality filters
      if (filters.hideIncompleteData) {
        // Filter out stations with "Unknown" or incomplete data
        if (
          !station.name ||
          station.name.toLowerCase().includes('unknown') ||
          !station.postcode ||
          station.postcode === 'UNKNOWN' ||
          !station.addressLine1 ||
          station.addressLine1.toLowerCase().includes('unknown')
        ) {
          return false;
        }
      }

      // Note: hideNoPrices filter is handled at the component level
      // since prices are loaded per-station for performance
      const stationPrices = prices.get(station._id);

      // Brand filter
      if (filters.brands.length > 0 && station.brand) {
        if (!filters.brands.includes(station.brand)) {
          return false;
        }
      }

      // Distance filter
      if (filters.maxDistance !== undefined) {
        if (station.distance > filters.maxDistance) {
          return false;
        }
      }

      // Price filter (based on selected fuel type)
      if (stationPrices) {
        const fuelPrice = stationPrices.find(p => p.fuelType === selectedFuelType);
        
        if (fuelPrice) {
          if (filters.minPrice !== undefined && fuelPrice.price < filters.minPrice) {
            return false;
          }
          if (filters.maxPrice !== undefined && fuelPrice.price > filters.maxPrice) {
            return false;
          }
        }
      }

      // Fuel type availability filter
      if (filters.hasFuelType && filters.hasFuelType.length > 0) {
        if (!stationPrices) return false;
        
        const hasAllRequired = filters.hasFuelType.every(fuelType =>
          stationPrices.some(p => p.fuelType === fuelType)
        );
        
        if (!hasAllRequired) return false;
      }

      return true;
    });
  }, [stations, filters, prices, selectedFuelType]);

  const updateFilter = <K extends keyof StationFilters>(
    key: K,
    value: StationFilters[K]
  ) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const toggleBrand = (brand: string) => {
    setFilters(prev => ({
      ...prev,
      brands: prev.brands.includes(brand)
        ? prev.brands.filter(b => b !== brand)
        : [...prev.brands, brand],
    }));
  };

  const resetFilters = () => {
    setFilters({
      brands: [],
      maxPrice: undefined,
      minPrice: undefined,
      maxDistance: undefined,
      hasFuelType: [],
      hideNoPrices: false,
      hideIncompleteData: true,
    });
  };

  const hasActiveFilters = 
    filters.brands.length > 0 ||
    filters.maxPrice !== undefined ||
    filters.minPrice !== undefined ||
    filters.maxDistance !== undefined ||
    (filters.hasFuelType && filters.hasFuelType.length > 0);

  return {
    filters,
    filteredStations,
    availableBrands,
    priceRange,
    updateFilter,
    toggleBrand,
    resetFilters,
    hasActiveFilters,
    filterCount: filteredStations.length,
    totalCount: stations.length,
  };
}
