import { useState, useCallback } from 'react';
import { fuelFinderClient } from '@/lib/fuel-finder-client';
import type {
  SearchParams,
  PetrolStation,
  FuelFinderResponse,
  ApiError,
} from '@/types/fuel-finder';

interface UseFuelFinderState {
  stations: PetrolStation[];
  isLoading: boolean;
  error: string | null;
  total: number;
}

interface UseFuelFinderReturn extends UseFuelFinderState {
  searchByPostcode: (postcode: string, options?: Omit<SearchParams, 'postcode'>) => Promise<void>;
  searchByLocation: (
    latitude: number,
    longitude: number,
    options?: Omit<SearchParams, 'latitude' | 'longitude'>
  ) => Promise<void>;
  getAllPrices: (options?: SearchParams) => Promise<void>;
  clearResults: () => void;
  isConfigured: boolean;
}

/**
 * React hook for interacting with the Fuel Finder API
 * 
 * @example
 * ```tsx
 * const { stations, isLoading, error, searchByPostcode } = useFuelFinder();
 * 
 * const handleSearch = async () => {
 *   await searchByPostcode('SW1A 1AA', { fuelType: 'E10', radius: 5 });
 * };
 * ```
 */
export function useFuelFinder(): UseFuelFinderReturn {
  const [state, setState] = useState<UseFuelFinderState>({
    stations: [],
    isLoading: false,
    error: null,
    total: 0,
  });

  const isConfigured = fuelFinderClient.isConfigured();

  const handleResponse = useCallback((response: FuelFinderResponse | ApiError) => {
    if (response.success) {
      setState({
        stations: response.data,
        isLoading: false,
        error: null,
        total: response.meta.total,
      });
    } else {
      setState({
        stations: [],
        isLoading: false,
        error: response.error.message,
        total: 0,
      });
    }
  }, []);

  const searchByPostcode = useCallback(
    async (postcode: string, options?: Omit<SearchParams, 'postcode'>) => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const response = await fuelFinderClient.searchByPostcode(postcode, options);
      handleResponse(response);
    },
    [handleResponse]
  );

  const searchByLocation = useCallback(
    async (
      latitude: number,
      longitude: number,
      options?: Omit<SearchParams, 'latitude' | 'longitude'>
    ) => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const response = await fuelFinderClient.searchByLocation(latitude, longitude, options);
      handleResponse(response);
    },
    [handleResponse]
  );

  const getAllPrices = useCallback(
    async (options?: SearchParams) => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const response = await fuelFinderClient.getAllPrices(options);
      handleResponse(response);
    },
    [handleResponse]
  );

  const clearResults = useCallback(() => {
    setState({
      stations: [],
      isLoading: false,
      error: null,
      total: 0,
    });
  }, []);

  return {
    ...state,
    searchByPostcode,
    searchByLocation,
    getAllPrices,
    clearResults,
    isConfigured,
  };
}
