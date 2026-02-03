# UK Fuel Price Finder

A React application to search and compare fuel prices across UK petrol stations using the government's statutory Fuel Finder scheme API with historical price tracking powered by Convex.

## Features

- 🔍 Search petrol stations by postcode
- ⛽ Filter by fuel type (E5, E10, Diesel, Super Diesel, B10, HVO)
- 📍 Configurable search radius
- 💰 Sort results by price
- 🕐 Real-time price updates (within 30 minutes)
- 📊 **Historical price tracking** with Convex
- 📈 **Price trends and analytics**
- 🔔 **Price alerts** (notify when prices drop)
- ⚡ **Fast local queries** with automatic sync
- 📱 Responsive design

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure API Access

Register for OAuth 2.0 credentials at the [UK Fuel Finder Developer Portal](https://www.developer.fuel-finder.service.gov.uk/):

1. Create an account and register your application
2. Obtain your OAuth 2.0 credentials (Client ID and Client Secret)
3. Create a `.env` file in the project root:

```bash
cp .env.example .env
```

4. Add your credentials to `.env`:

```env
VITE_FUEL_FINDER_CLIENT_ID=your_client_id_here
VITE_FUEL_FINDER_CLIENT_SECRET=your_client_secret_here
```

The client will automatically handle OAuth 2.0 token management, including:
- Requesting access tokens using client credentials flow
- Caching tokens until expiry
- Automatically refreshing expired tokens

### 3. Set Up Convex (Optional but Recommended)

Convex enables historical price tracking, analytics, and faster queries:

1. Create a Convex account at [dashboard.convex.dev](https://dashboard.convex.dev/)
2. Initialize Convex:

```bash
npx convex dev
```

3. Add `VITE_CONVEX_URL` to your `.env` file
4. Set backend environment variables in the Convex dashboard

**📖 See [CONVEX_SETUP.md](./CONVEX_SETUP.md) for detailed instructions**

### 4. Run Development Server

```bash
# Terminal 1: Run Convex (if using)
npx convex dev

# Terminal 2: Run your app
pnpm dev
```

The app will be available at `http://localhost:3000`

## API Integration

### Architecture

The application uses a modular architecture:

```
src/
├── types/
│   └── fuel-finder.ts          # TypeScript types for API responses
├── lib/
│   └── fuel-finder-client.ts   # API client with OAuth 2.0 support
├── hooks/
│   └── use-fuel-finder.ts      # React hook for API interaction
└── components/
    └── fuel-finder-search.tsx  # Main search component
```

### Using the Fuel Finder Client

The client handles OAuth 2.0 authentication automatically. You just need to configure your credentials in `.env`.

#### Direct API Usage

```typescript
import { fuelFinderClient } from '@/lib/fuel-finder-client';

// Search by postcode (OAuth handled automatically)
const response = await fuelFinderClient.searchByPostcode('SW1A 1AA', {
  fuelType: 'E10',
  radius: 5,
  sortBy: 'price',
  limit: 20
});

// Search by coordinates
const response = await fuelFinderClient.searchByLocation(51.5074, -0.1278, {
  fuelType: 'Diesel',
  radius: 10
});

// Get all prices
const response = await fuelFinderClient.getAllPrices({
  fuelType: 'E5',
  limit: 100
});
```

#### Using the React Hook

```typescript
import { useFuelFinder } from '@/hooks/use-fuel-finder';

function MyComponent() {
  const { stations, isLoading, error, searchByPostcode } = useFuelFinder();

  const handleSearch = async () => {
    await searchByPostcode('SW1A 1AA', {
      fuelType: 'E10',
      radius: 5
    });
  };

  return (
    <div>
      {isLoading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      {stations.map(station => (
        <div key={station.id}>{station.name}</div>
      ))}
    </div>
  );
}
```

## API Reference

### Search Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `postcode` | string | UK postcode to search near |
| `latitude` | number | Latitude coordinate |
| `longitude` | number | Longitude coordinate |
| `radius` | number | Search radius in miles (default: 5) |
| `fuelType` | FuelType | Filter by fuel type |
| `sortBy` | 'price' \| 'distance' | Sort order |
| `limit` | number | Maximum results to return |

### Fuel Types

- `E5` - Super Unleaded (5% ethanol)
- `E10` - Regular Unleaded (10% ethanol)
- `Diesel` - Standard diesel
- `Super Diesel` - Premium diesel
- `B10` - Biodiesel blend
- `HVO` - Hydrotreated Vegetable Oil

## Data Source & Authentication

### UK Statutory Fuel Finder Scheme
- All UK petrol stations (mandatory reporting as of 2 Feb 2026)
- Updates within 30 minutes of price changes
- Operated by VE3 Global Ltd
- OAuth 2.0 authentication required

### OAuth 2.0 Flow
The API uses Client Credentials flow:
- Access tokens are automatically requested and cached
- Tokens are refreshed when expired
- 401 errors trigger automatic token refresh and retry
- Register at [developer.fuel-finder.service.gov.uk](https://www.developer.fuel-finder.service.gov.uk/)

## Building for Production

```bash
pnpm build
```

The production build will be output to the `dist/` directory.

## Tech Stack

- **Framework**: React 19 + Vite
- **Router**: TanStack Router
- **Database**: Convex (real-time, historical tracking)
- **UI**: Base UI + Tailwind CSS
- **TypeScript**: Full type safety
- **Icons**: Lucide React
- **Auth**: OAuth 2.0 Client Credentials

## License

MIT

## Support

For API issues, contact the [UK Fuel Finder support](https://www.developer.fuel-finder.service.gov.uk/support).

For application issues, please open a GitHub issue.
