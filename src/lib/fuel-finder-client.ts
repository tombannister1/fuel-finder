/**
 * Fuel Finder API Client
 * Integrates with the UK Government's statutory Fuel Finder scheme
 * Uses OAuth 2.0 Client Credentials flow for authentication
 * 
 * Setup Instructions:
 * 1. Register at https://www.developer.fuel-finder.service.gov.uk/
 * 2. Obtain your OAuth 2.0 credentials (client_id and client_secret)
 * 3. Add to environment variables:
 *    VITE_FUEL_FINDER_CLIENT_ID=your_client_id
 *    VITE_FUEL_FINDER_CLIENT_SECRET=your_client_secret
 *    VITE_FUEL_FINDER_API_URL=https://api.fuel-finder.service.gov.uk/v1
 *    VITE_FUEL_FINDER_TOKEN_URL=https://auth.fuel-finder.service.gov.uk/oauth2/token
 */

import type {
  FuelFinderResponse,
  ApiError,
  SearchParams,
} from '@/types/fuel-finder';

const API_BASE_URL = import.meta.env.VITE_FUEL_FINDER_API_URL || 
  'https://www.fuel-finder.service.gov.uk/api/v1';

const TOKEN_URL = import.meta.env.VITE_FUEL_FINDER_TOKEN_URL ||
  'https://www.fuel-finder.service.gov.uk/api/v1/oauth/generate_access_token';

const CLIENT_ID = import.meta.env.VITE_FUEL_FINDER_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_FUEL_FINDER_CLIENT_SECRET;

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

class FuelFinderClient {
  private baseUrl: string;
  private tokenUrl: string;
  private clientId: string | undefined;
  private clientSecret: string | undefined;
  private accessToken: string | null = null;
  private tokenExpiry: number | null = null;

  constructor() {
    this.baseUrl = API_BASE_URL;
    this.tokenUrl = TOKEN_URL;
    this.clientId = CLIENT_ID;
    this.clientSecret = CLIENT_SECRET;
  }

  /**
   * Check if OAuth 2.0 credentials are configured
   */
  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  /**
   * Get OAuth 2.0 access token using client credentials flow
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid (with 60 second buffer)
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry - 60000) {
      return this.accessToken;
    }

    if (!this.clientId || !this.clientSecret) {
      throw new Error('OAuth 2.0 credentials not configured');
    }

    try {
      const response = await fetch(this.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OAuth token request failed: ${response.status} - ${errorText}`);
      }

      const responseData = await response.json();
      
      // Token might be nested in data.access_token or directly in access_token
      const data = responseData.data || responseData;
      
      this.accessToken = data.access_token;
      // Set expiry time (current time + expires_in seconds - 60 second buffer)
      this.tokenExpiry = Date.now() + (data.expires_in * 1000);

      return this.accessToken;
    } catch (error) {
      this.accessToken = null;
      this.tokenExpiry = null;
      throw error;
    }
  }

  /**
   * Clear cached access token (useful for testing or manual refresh)
   */
  clearToken(): void {
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Search for petrol stations by postcode
   */
  async searchByPostcode(
    postcode: string,
    options?: Omit<SearchParams, 'postcode'>
  ): Promise<FuelFinderResponse | ApiError> {
    return this.search({ postcode, ...options });
  }

  /**
   * Search for petrol stations by coordinates
   */
  async searchByLocation(
    latitude: number,
    longitude: number,
    options?: Omit<SearchParams, 'latitude' | 'longitude'>
  ): Promise<FuelFinderResponse | ApiError> {
    return this.search({ latitude, longitude, ...options });
  }

  /**
   * Generic search method with OAuth 2.0 authentication
   */
  private async search(params: SearchParams): Promise<FuelFinderResponse | ApiError> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: {
          code: 'OAUTH_CREDENTIALS_MISSING',
          message: 'OAuth 2.0 credentials not configured. Please add VITE_FUEL_FINDER_CLIENT_ID and VITE_FUEL_FINDER_CLIENT_SECRET to your .env file.',
        },
      };
    }

    try {
      // Get OAuth 2.0 access token
      const accessToken = await this.getAccessToken();

      const queryParams = new URLSearchParams();
      
      if (params.postcode) queryParams.append('postcode', params.postcode);
      if (params.latitude) queryParams.append('latitude', params.latitude.toString());
      if (params.longitude) queryParams.append('longitude', params.longitude.toString());
      if (params.radius) queryParams.append('radius', params.radius.toString());
      if (params.fuelType) queryParams.append('fuelType', params.fuelType);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.limit) queryParams.append('limit', params.limit.toString());

      const response = await fetch(
        `${this.baseUrl}/stations?${queryParams.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        // If 401, clear token and retry once
        if (response.status === 401 && this.accessToken) {
          this.clearToken();
          return this.search(params); // Retry with new token
        }

        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: {
            code: `HTTP_${response.status}`,
            message: errorData.message || `API request failed: ${response.statusText}`,
            details: errorData,
          },
        };
      }

      const data = await response.json();
      return data as FuelFinderResponse;
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'An unknown error occurred',
        },
      };
    }
  }

  /**
   * Get all available fuel prices (useful for initial load or broad search)
   */
  async getAllPrices(params?: SearchParams): Promise<FuelFinderResponse | ApiError> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: {
          code: 'OAUTH_CREDENTIALS_MISSING',
          message: 'OAuth 2.0 credentials not configured. Please add VITE_FUEL_FINDER_CLIENT_ID and VITE_FUEL_FINDER_CLIENT_SECRET to your .env file.',
        },
      };
    }

    try {
      // Get OAuth 2.0 access token
      const accessToken = await this.getAccessToken();

      const queryParams = new URLSearchParams();
      if (params?.fuelType) queryParams.append('fuelType', params.fuelType);
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const response = await fetch(
        `${this.baseUrl}/stations/all?${queryParams.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        // If 401, clear token and retry once
        if (response.status === 401 && this.accessToken) {
          this.clearToken();
          return this.getAllPrices(params); // Retry with new token
        }

        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: {
            code: `HTTP_${response.status}`,
            message: errorData.message || `API request failed: ${response.statusText}`,
            details: errorData,
          },
        };
      }

      const data = await response.json();
      return data as FuelFinderResponse;
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: error instanceof Error ? error.message : 'An unknown error occurred',
        },
      };
    }
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

// Export singleton instance
export const fuelFinderClient = new FuelFinderClient();

// Export class for testing
export { FuelFinderClient };
