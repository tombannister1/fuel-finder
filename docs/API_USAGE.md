# Fuel Finder API Usage Guide

This guide covers how to integrate with the UK Government's Fuel Finder API for your application.

## Table of Contents

1. [Quick Start](#quick-start)
2. [API Registration](#api-registration)
3. [Client Usage](#client-usage)
4. [React Hook Usage](#react-hook-usage)
5. [Advanced Examples](#advanced-examples)
6. [Error Handling](#error-handling)
7. [Fallback Data](#fallback-data)

## Quick Start

### Basic Postcode Search

```typescript
import { fuelFinderClient } from '@/lib/fuel-finder-client';

// Search for stations near a postcode
const result = await fuelFinderClient.searchByPostcode('SW1A 1AA');

if (result.success) {
  console.log(`Found ${result.data.length} stations`);
  result.data.forEach(station => {
    console.log(`${station.name} - ${station.address.postcode}`);
  });
} else {
  console.error(`Error: ${result.error.message}`);
}
```

## API Registration

### Step 1: Register Your Application

1. Visit https://www.developer.fuel-finder.service.gov.uk/
2. Click "Register" or "Sign In"
3. Complete the registration form
4. Create a new application/project
5. Note your OAuth 2.0 credentials (Client ID and Client Secret)

### Step 2: Configure Environment

Create `.env` file in your project root:

```bash
# OAuth 2.0 Client Credentials
VITE_FUEL_FINDER_CLIENT_ID=your_client_id_here
VITE_FUEL_FINDER_CLIENT_SECRET=your_client_secret_here

# Optional: Custom endpoints
VITE_FUEL_FINDER_API_URL=https://api.fuel-finder.service.gov.uk/v1
VITE_FUEL_FINDER_TOKEN_URL=https://auth.fuel-finder.service.gov.uk/oauth2/token
```

**Security Note**: Never commit `.env` files to version control!

### Step 3: Verify Configuration

```typescript
import { fuelFinderClient } from '@/lib/fuel-finder-client';

if (fuelFinderClient.isConfigured()) {
  console.log('✅ OAuth 2.0 credentials configured');
} else {
  console.log('⚠️ OAuth 2.0 credentials missing');
}
```

## OAuth 2.0 Authentication

The Fuel Finder API uses **OAuth 2.0 Client Credentials** flow. The client handles this automatically:

### How It Works

1. **Token Request**: When you make your first API call, the client requests an access token using your client ID and secret
2. **Token Caching**: The access token is cached in memory and reused for subsequent requests
3. **Automatic Refresh**: When a token expires (or returns 401), the client automatically requests a new token and retries
4. **Transparent**: You don't need to manually handle tokens - just configure your credentials

### Token Lifecycle

```typescript
// First request - automatically gets token
const result1 = await fuelFinderClient.searchByPostcode('SW1A 1AA');

// Subsequent requests - uses cached token
const result2 = await fuelFinderClient.searchByPostcode('EC1A 1BB');

// If token expires - automatically refreshes
const result3 = await fuelFinderClient.searchByPostcode('M1 1AA');

// Manual token clear (if needed for testing)
fuelFinderClient.clearToken();
```

## Client Usage

### Search by Postcode

```typescript
// Basic search
const result = await fuelFinderClient.searchByPostcode('EC1A 1BB');

// With options
const result = await fuelFinderClient.searchByPostcode('EC1A 1BB', {
  fuelType: 'E10',      // Filter by fuel type
  radius: 5,            // 5 mile radius
  sortBy: 'price',      // Sort by price (or 'distance')
  limit: 20             // Limit to 20 results
});
```

### Search by Coordinates

```typescript
// Using GPS coordinates
const result = await fuelFinderClient.searchByLocation(
  51.5074,  // latitude
  -0.1278,  // longitude
  {
    radius: 10,
    fuelType: 'Diesel',
    sortBy: 'distance'
  }
);
```

### Get All Prices

Useful for initial data load or nationwide comparison:

```typescript
const result = await fuelFinderClient.getAllPrices({
  fuelType: 'E5',
  limit: 100
});
```

## React Hook Usage

The `useFuelFinder` hook provides a convenient way to integrate the API into React components.

### Basic Usage

```tsx
import { useFuelFinder } from '@/hooks/use-fuel-finder';

function FuelSearch() {
  const { stations, isLoading, error, searchByPostcode } = useFuelFinder();

  const handleSearch = async () => {
    await searchByPostcode('SW1A 1AA', {
      fuelType: 'E10',
      radius: 5
    });
  };

  return (
    <div>
      <button onClick={handleSearch} disabled={isLoading}>
        Search
      </button>
      
      {isLoading && <p>Loading...</p>}
      {error && <p className="error">{error}</p>}
      
      <ul>
        {stations.map(station => (
          <li key={station.id}>{station.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

### With User Location

```tsx
function NearbyFuelPrices() {
  const { stations, isLoading, searchByLocation } = useFuelFinder();

  const findNearby = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          await searchByLocation(
            position.coords.latitude,
            position.coords.longitude,
            { radius: 3, sortBy: 'distance' }
          );
        },
        (error) => console.error('Location error:', error)
      );
    }
  };

  return (
    <button onClick={findNearby}>
      Find Fuel Near Me
    </button>
  );
}
```

### State Management

```tsx
function FuelPriceTracker() {
  const {
    stations,
    isLoading,
    error,
    total,
    searchByPostcode,
    clearResults,
  } = useFuelFinder();

  return (
    <div>
      <p>Found {total} stations</p>
      
      {error && (
        <div className="error">
          {error}
          <button onClick={clearResults}>Clear</button>
        </div>
      )}
      
      {/* Display stations */}
    </div>
  );
}
```

## Advanced Examples

### Filter and Sort Results

```typescript
// Find cheapest E10 within 10 miles
const result = await fuelFinderClient.searchByPostcode('M1 1AA', {
  fuelType: 'E10',
  radius: 10,
  sortBy: 'price',
  limit: 5  // Top 5 cheapest
});

if (result.success) {
  const cheapest = result.data[0];
  const cheapestPrice = cheapest.fuelPrices.find(p => p.fuelType === 'E10');
  console.log(`Cheapest: ${cheapest.name} at ${cheapestPrice?.price}p/L`);
}
```

### Compare Multiple Fuel Types

```typescript
const postcode = 'B1 1AA';
const fuelTypes = ['E5', 'E10', 'Diesel'];

const results = await Promise.all(
  fuelTypes.map(type =>
    fuelFinderClient.searchByPostcode(postcode, {
      fuelType: type as FuelType,
      radius: 5,
      limit: 1
    })
  )
);

results.forEach((result, index) => {
  if (result.success && result.data.length > 0) {
    const station = result.data[0];
    const price = station.fuelPrices[0];
    console.log(`${fuelTypes[index]}: £${(price.price / 100).toFixed(2)}`);
  }
});
```

### Calculate Distance

```typescript
import { fuelFinderClient } from '@/lib/fuel-finder-client';

const userLat = 51.5074;
const userLon = -0.1278;

const result = await fuelFinderClient.searchByLocation(userLat, userLon);

if (result.success) {
  const stationsWithDistance = result.data.map(station => ({
    ...station,
    distance: fuelFinderClient.calculateDistance(
      userLat,
      userLon,
      station.location.latitude,
      station.location.longitude
    )
  }));

  // Sort by distance
  stationsWithDistance.sort((a, b) => a.distance - b.distance);
}
```

### Real-time Price Updates

```tsx
function LivePriceTracker({ postcode }: { postcode: string }) {
  const { stations, searchByPostcode } = useFuelFinder();

  useEffect(() => {
    // Initial search
    searchByPostcode(postcode);

    // Refresh every 5 minutes (API updates within 30 mins)
    const interval = setInterval(() => {
      searchByPostcode(postcode);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [postcode, searchByPostcode]);

  return (
    <div>
      {stations.map(station => (
        <StationCard key={station.id} station={station} />
      ))}
    </div>
  );
}
```

## Error Handling

### Check Response Success

```typescript
const result = await fuelFinderClient.searchByPostcode('SW1A 1AA');

if (result.success) {
  // Handle successful response
  console.log('Stations:', result.data);
} else {
  // Handle error
  console.error('Error:', result.error.message);
  console.error('Code:', result.error.code);
}
```

### Common Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| `API_KEY_MISSING` | No API key configured | Add VITE_FUEL_FINDER_API_KEY to .env |
| `HTTP_401` | Unauthorized | Check API key is valid |
| `HTTP_403` | Forbidden | Verify API access permissions |
| `HTTP_404` | Not Found | Check endpoint URL |
| `HTTP_429` | Too Many Requests | Implement rate limiting |
| `NETWORK_ERROR` | Connection failed | Check internet connection |

### Robust Error Handling

```typescript
async function robustSearch(postcode: string) {
  try {
    const result = await fuelFinderClient.searchByPostcode(postcode);
    
    if (result.success) {
      return result.data;
    } else {
      // Log error details
      console.error('API Error:', result.error);
      
      // Provide user-friendly message
      if (result.error.code === 'HTTP_401') {
        throw new Error('API authentication failed. Please check your credentials.');
      } else if (result.error.code === 'NETWORK_ERROR') {
        throw new Error('Network connection failed. Please check your internet.');
      } else {
        throw new Error('Failed to fetch fuel prices. Please try again.');
      }
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    throw error;
  }
}
```

## API Configuration Required

This application requires a valid API key to function. Without it, all requests will return an error with code `API_KEY_MISSING`.

### API Key Benefits

| Feature | Details |
|---------|---------|
| Coverage | All UK petrol stations |
| Update Frequency | Within 30 minutes of price changes |
| Data Accuracy | Statutory requirement (mandatory reporting) |
| Authentication | Bearer token via API key |

## Best Practices

### 1. Cache Results

```typescript
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCachedPrices(postcode: string) {
  const cached = cache.get(postcode);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const result = await fuelFinderClient.searchByPostcode(postcode);
  
  if (result.success) {
    cache.set(postcode, {
      data: result.data,
      timestamp: Date.now()
    });
    return result.data;
  }
  
  return [];
}
```

### 2. Rate Limiting

```typescript
import pThrottle from 'p-throttle';

// Limit to 10 requests per minute
const throttle = pThrottle({
  limit: 10,
  interval: 60 * 1000
});

const throttledSearch = throttle(
  (postcode: string) => fuelFinderClient.searchByPostcode(postcode)
);
```

### 3. Validate Postcodes

```typescript
function isValidUKPostcode(postcode: string): boolean {
  const regex = /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i;
  return regex.test(postcode.trim());
}

async function searchWithValidation(postcode: string) {
  if (!isValidUKPostcode(postcode)) {
    throw new Error('Invalid UK postcode format');
  }
  
  return fuelFinderClient.searchByPostcode(postcode);
}
```

### 4. Progressive Enhancement

```typescript
function useFuelSearch() {
  const { isConfigured } = useFuelFinder();
  
  return {
    dataSource: isConfigured ? 'Full API' : 'Interim Data',
    coverage: isConfigured ? 'All UK' : 'Major Retailers',
    updateFrequency: isConfigured ? '30 minutes' : 'Daily'
  };
}
```

## TypeScript Types

All types are exported from `@/types/fuel-finder`:

```typescript
import type {
  FuelType,
  FuelPrice,
  PetrolStation,
  SearchParams,
  FuelFinderResponse,
  ApiError,
} from '@/types/fuel-finder';
```

## Support

- **API Issues**: [Fuel Finder Support](https://www.developer.fuel-finder.service.gov.uk/support)
- **Documentation**: [Official API Docs](https://www.developer.fuel-finder.service.gov.uk/docs)
- **Government Info**: [Access Fuel Price Data](https://www.gov.uk/guidance/access-fuel-price-data)
