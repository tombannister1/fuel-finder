# Price History Tracking

The Fuel Price Finder now includes comprehensive price history tracking and visualization capabilities.

## Overview

Every time the sync runs (via `pnpm sync:daemon` or Vercel cron), the system records current fuel prices in a time-series database. This enables powerful price tracking and analysis features.

## Features

### 📊 Interactive Price Graphs
- View price changes over time for any station and fuel type
- Zoom into specific time periods (24 hours to 3 months)
- Compare different fuel types
- See min, max, and average prices
- Track price trends (up/down/stable)

### 📈 Price Statistics
- **Current Price**: Latest recorded price
- **Price Change**: Difference from oldest to newest in selected range
- **Change Percentage**: Relative price movement
- **Lowest Price**: Minimum price in time range
- **Highest Price**: Maximum price in time range
- **Average Price**: Mean price across all data points

### ⏱️ Data Granularity

With `pnpm sync:daemon` running:
- **Every 30 minutes**: ~48 data points per day
- **Every 15 minutes**: ~96 data points per day
- **Every hour**: ~24 data points per day

The more frequently you sync, the more detailed your historical data!

## Usage

### In the UI

1. Navigate to the "Price History" page (click button in header)
2. Search for a station by postcode, city, or town
3. Select a station from the results
4. Choose your fuel type and time range
5. View the interactive graph and statistics

### Programmatic Access

Use the Convex query directly in your components:

```typescript
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';

const priceHistory = useQuery(api.fuelPrices.getPriceHistory, {
  stationId: "station_id_here",
  fuelType: "E10",
  daysBack: 30
});
```

### Using the Component

```typescript
import { PriceHistoryGraph } from '@/components/price-history-graph';

<PriceHistoryGraph
  stationId={stationId}
  stationName="Optional Station Name"
  defaultFuelType="E10"
/>
```

## Data Model

### Price Records

Each price sync creates a new record:

```typescript
{
  _id: "unique_id",
  stationId: "station_id",
  fuelType: "E10" | "E5" | "Diesel" | etc.,
  price: 134.9,  // Price in pence
  recordedAt: 1707048000000,  // Unix timestamp (when we recorded it)
  sourceTimestamp: "2024-02-04T10:00:00Z"  // When API last updated it
}
```

### Database Indexes

The `fuelPrices` table has optimized indexes for fast queries:
- `by_station_fuel_time`: Efficient time-series queries for specific station/fuel
- `by_station`: All prices for a station
- `by_fuel_type`: All prices for a fuel type
- `by_recorded_at`: Time-based queries

## Data Retention

**All historical data is preserved permanently.**

The sync never deletes old price records, so you can:
- Track long-term trends
- Analyze seasonal patterns
- Compare prices across months/years
- Build historical datasets for analysis

## Performance

### Query Performance
- Indexed queries are fast even with millions of records
- Typical query time: < 100ms
- Graph renders in real-time as data loads

### Storage
- Each price record: ~100 bytes
- 48 records/day × 8,000 stations × 2 fuel types = ~768,000 records/day
- Estimated storage: ~76 MB/day
- Convex provides 1 GB free storage (enough for ~13 days at peak usage)

## Tips for Better Data

1. **Run daemon consistently**: Leave `pnpm sync:daemon` running for continuous data collection
2. **Adjust interval**: Use shorter intervals (15 mins) during peak times for more granular data
3. **Monitor sync logs**: Check terminal output to ensure syncs are succeeding
4. **Historical backfill**: Past prices from the API are recorded with their `sourceTimestamp`

## Example Use Cases

### 1. Find the Best Time to Fill Up
Track your local station's prices over a week to find the cheapest day/time.

### 2. Price Comparison
Compare multiple stations in your area to see which has the most stable prices.

### 3. Market Analysis
Analyze fuel price trends across regions or brands.

### 4. Alert on Price Drops
Build alerts when prices drop below a threshold (using the `priceAlerts` table).

### 5. Budget Planning
Use average prices to forecast fuel costs for the month.

## API Reference

### Query: `getPriceHistory`

```typescript
api.fuelPrices.getPriceHistory({
  stationId: Id<"stations">,
  fuelType: "E5" | "E10" | "Diesel" | "Super Diesel" | "B10" | "HVO",
  daysBack?: number  // Optional, defaults to 30
})
```

Returns an array of price records sorted by `recordedAt` (newest first).

## Troubleshooting

### No data showing?
- Ensure you've run `pnpm sync:prices` or `pnpm sync:daemon` at least once
- Check that stations have been synced (`pnpm sync:stations`)
- Verify the daemon is running in the terminal

### Graph not updating?
- Prices only update when sync runs
- Check the "recorded" badge below the graph for data point count
- Refresh the page after a sync completes

### Performance issues?
- Reduce the time range (use "Last 24 Hours" instead of "Last 3 Months")
- The graph handles thousands of points efficiently, but very large ranges may be slower

## Future Enhancements

Potential features to add:
- [ ] Multi-station comparison graphs
- [ ] Price alerts/notifications
- [ ] Export data to CSV
- [ ] Custom date range picker
- [ ] Price prediction using historical trends
- [ ] Regional price heatmaps
- [ ] Station price volatility metrics

## Related Files

- Component: `src/components/price-history-graph.tsx`
- Example Page: `src/components/price-history-example.tsx`
- Route: `src/routes/history.tsx`
- Query: `convex/fuelPrices.ts` (getPriceHistory)
- Schema: `convex/schema.ts` (fuelPrices table)
