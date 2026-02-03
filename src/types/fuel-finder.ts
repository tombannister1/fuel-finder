// TypeScript types for UK Fuel Finder API
// Based on the statutory scheme launched February 2026

export type FuelType = 'E5' | 'E10' | 'Diesel' | 'Super Diesel' | 'B10' | 'HVO';

export interface FuelPrice {
  fuelType: FuelType;
  price: number; // Price in pence per litre
  lastUpdated: string; // ISO 8601 timestamp
}

export interface PetrolStation {
  id: string;
  name: string;
  brand?: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    county?: string;
    postcode: string;
  };
  location: {
    latitude: number;
    longitude: number;
  };
  fuelPrices: FuelPrice[];
  distance?: number; // Distance in miles (calculated)
  amenities?: string[];
  openingHours?: {
    day: string;
    open: string;
    close: string;
  }[];
}

export interface SearchParams {
  postcode?: string;
  latitude?: number;
  longitude?: number;
  radius?: number; // Search radius in miles
  fuelType?: FuelType;
  sortBy?: 'price' | 'distance';
  limit?: number;
}

export interface FuelFinderResponse {
  success: boolean;
  data: PetrolStation[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    query: SearchParams;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
