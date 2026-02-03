# Direct API vs Convex: Which to Use?

This app supports two approaches for accessing fuel price data:

## 1. Direct API Calls (Original)

### How It Works
- Calls UK Fuel Finder API directly from the browser
- OAuth 2.0 authentication handled in frontend
- Real-time data on every request

### Pros
- ✅ Always up-to-date (real-time)
- ✅ No database setup needed
- ✅ Simple architecture

### Cons
- ❌ No historical data
- ❌ Slower (API call on every search)
- ❌ Higher API costs
- ❌ No offline capability
- ❌ Can't track price trends
- ❌ No analytics

### Use When
- You only need current prices
- You want minimal setup
- You don't care about history

### Code Example
```typescript
import { fuelFinderClient } from '@/lib/fuel-finder-client';

const result = await fuelFinderClient.searchByPostcode('SW1A 1AA');
```

---

## 2. Convex Database (Recommended)

### How It Works
- Stores fuel price data in Convex
- Syncs from API periodically or on-demand
- Tracks all price changes over time
- Queries run against local Convex database

### Pros
- ✅ **Historical price tracking**
- ✅ **Much faster queries** (no API delay)
- ✅ **Reduced API costs** (sync periodically)
- ✅ **Price trend analytics**
- ✅ **Price alerts**
- ✅ Real-time updates across all clients
- ✅ Offline-capable (cached data)

### Cons
- ❌ Requires Convex setup
- ❌ Slightly more complex architecture
- ❌ Needs periodic syncing

### Use When
- You want historical data
- You need analytics/trends
- You want price alerts
- You want faster searches
- You want to reduce API costs

### Code Example
```typescript
import { useStationsByPostcode, useSyncByPostcode } from '@/hooks/use-convex-fuel-finder';

function MyComponent() {
  const stations = useStationsByPostcode('SW1A 1AA');
  const sync = useSyncByPostcode();

  // Sync if no data
  React.useEffect(() => {
    if (!stations || stations.length === 0) {
      sync('SW1A 1AA');
    }
  }, []);

  return <div>...</div>;
}
```

---

## Feature Comparison

| Feature | Direct API | Convex |
|---------|-----------|--------|
| **Current Prices** | ✅ | ✅ |
| **Search by Postcode** | ✅ | ✅ |
| **Search by Location** | ✅ | ✅ |
| **Real-time Data** | ✅ Always | ✅ After sync |
| **Historical Prices** | ❌ | ✅ |
| **Price Trends** | ❌ | ✅ |
| **Price Charts** | ❌ | ✅ |
| **Price Alerts** | ❌ | ✅ |
| **Statistics** | ❌ | ✅ |
| **Query Speed** | Slow (API) | Fast (local) |
| **API Call Cost** | High | Low |
| **Setup Complexity** | Low | Medium |
| **Offline Capability** | ❌ | ✅ (cached) |

---

## Hybrid Approach (Best of Both)

You can use **both** approaches together:

### Strategy
1. Use Convex for normal searches (fast, cached)
2. Sync from API periodically (every 30-60 minutes)
3. Allow manual "refresh" to sync on-demand

### Implementation

```typescript
import { useSmartSearch } from '@/hooks/use-convex-fuel-finder';

function SearchComponent() {
  const { stations, search, hasData } = useSmartSearch('SW1A 1AA', {
    autoSync: true, // Auto-sync if no local data
  });

  React.useEffect(() => {
    search(); // Check local data first, sync if needed
  }, []);

  return <div>...</div>;
}
```

### Benefits
- Fast queries (Convex cache)
- Historical tracking
- Always reasonably fresh data
- Reduced API costs

---

## Cost Comparison

Assuming 1000 searches per day:

### Direct API Only
- **API Calls**: 1000 per day
- **Latency**: 500-1000ms per search
- **Cost**: High (1000 API calls)

### Convex with Hourly Sync
- **API Calls**: 24 per day (hourly sync)
- **Latency**: 50-100ms per search
- **Cost**: Low (96% reduction in API calls)
- **Bonus**: Historical data, analytics, alerts

---

## Migration Path

### Start Simple
```typescript
// Phase 1: Direct API
import { fuelFinderClient } from '@/lib/fuel-finder-client';
const result = await fuelFinderClient.searchByPostcode('SW1A 1AA');
```

### Add Convex Later
```typescript
// Phase 2: Add Convex
import { useStationsByPostcode } from '@/hooks/use-convex-fuel-finder';
const stations = useStationsByPostcode('SW1A 1AA');
```

Both can coexist! Add Convex when you're ready for advanced features.

---

## Recommendations

### For Prototypes/MVPs
→ **Direct API**: Get started quickly, add Convex later

### For Production Apps
→ **Convex**: Better UX, lower costs, more features

### For Analytics/Dashboards
→ **Convex**: Required for historical data and trends

### For Price Comparison Sites
→ **Convex**: Essential for tracking and alerts

---

## Quick Start Commands

### Direct API Only
```bash
# 1. Set API credentials in .env
cp .env.example .env

# 2. Run dev server
pnpm dev
```

### With Convex
```bash
# 1. Set API credentials in .env
cp .env.example .env

# 2. Initialize Convex
npx convex dev

# 3. Run dev server (in another terminal)
pnpm dev
```

---

## Questions?

- See [CONVEX_SETUP.md](../CONVEX_SETUP.md) for detailed Convex setup
- See [API_USAGE.md](./API_USAGE.md) for direct API usage
- Check [README.md](../README.md) for overview
