# API Sync Strategy

This document explains the two-endpoint sync strategy for fetching fuel station and price data from the UK Government Fuel Finder API.

## Overview

Instead of fetching all data (stations + prices) every time, we use a more efficient two-endpoint approach:

1. **Station Metadata Sync** (`getPFSInfo`) - Runs weekly
2. **Incremental Price Sync** (`getIncrementalPFSFuelPrices`) - Runs every 30 minutes

## Why This Approach?

### Old Approach Problems
- Fetched unchanging station metadata with every price update
- Large payload sizes
- Slower sync times
- Higher API usage
- Couldn't update prices frequently without wasting resources

### New Approach Benefits
- ✅ Station metadata fetched only when needed (weekly)
- ✅ Price updates are lightweight and fast
- ✅ Can sync prices more frequently (every 30 mins)
- ✅ Lower API usage and bandwidth
- ✅ Better data freshness

## API Endpoints

### 1. Station Metadata Endpoint
**Endpoint:** `GET /api/v1/pfs?batch-number={n}`  
**Used by:** `api.sync.syncStations`  
**Frequency:** Weekly (Sundays at 2 AM)  
**Returns:** Station information including:
- Station ID, name, brand
- Full address details
- Latitude/longitude coordinates
- Amenities

### 2. Incremental Price Endpoint
**Endpoint:** `GET /api/v1/pfs/fuel-prices?since={timestamp}&batch-number={n}`  
**Used by:** `api.sync.syncPrices`  
**Frequency:** Every 30 minutes  
**Returns:** Only price updates since the last sync:
- Station ID
- Fuel type
- Price
- Last updated timestamp

## Implementation

### Convex Actions

#### `api.sync.syncStations`
```typescript
// Fetches all station metadata
const result = await client.action(api.sync.syncStations, {});
```

#### `api.sync.syncPrices`
```typescript
// Fetches incremental price updates
const result = await client.action(api.sync.syncPrices, {
  sinceTimestamp: "2026-02-01T00:00:00Z" // Optional
});
```

### Cron Job Schedule

**File:** `api/cron/import-fuel-data.ts`  
**Schedule:** Every 30 minutes (`*/30 * * * *`)

**Behavior:**
- **Regular runs (30 mins):** Incremental price sync only
- **Sunday 2 AM:** Full station sync + price sync

### Manual Sync

You can trigger manual syncs via the API endpoint:

```bash
# Sync stations only
curl http://localhost:3000/api/manual-import?type=stations

# Sync prices only
curl http://localhost:3000/api/manual-import?type=prices

# Sync both
curl http://localhost:3000/api/manual-import?type=both
```

## Data Flow

### Initial Setup
```
1. Run syncStations → Fetch all station metadata
2. Run syncPrices → Fetch all current prices
```

### Regular Updates
```
Every 30 minutes:
  1. Run syncPrices with last sync timestamp
  2. API returns only changed prices
  3. Update prices in database
  
Weekly (Sunday 2 AM):
  1. Run syncStations (refresh station metadata)
  2. Run syncPrices (ensure prices are current)
```

## Sync State Tracking

The system tracks sync state in the `syncState` table:

- `last_station_sync`: Last successful station sync timestamp
- `last_price_sync`: Last successful price sync timestamp

This enables incremental updates by telling the API "give me changes since X".

## Error Handling

### Stations Not Found
If price updates reference stations not in our database:
- Prices are skipped with a warning count
- Solution: Run a full station sync

### Sync Failures
- All sync operations log to the `syncLog` table
- Status: "started" → "completed" or "failed"
- Check recent syncs: `api.sync.getRecentSyncs()`

## Monitoring

### View Sync History
```typescript
// Get recent syncs
const syncs = await client.query(api.sync.getRecentSyncs, { limit: 10 });

// Get last successful station sync
const lastStationSync = await client.query(api.sync.getLastSuccessfulSync, {
  syncType: "stations"
});

// Get last successful price sync
const lastPriceSync = await client.query(api.sync.getLastSuccessfulSync, {
  syncType: "prices"
});
```

### Logs
All sync operations include detailed console logging:
- Batch progress
- Records processed
- Errors and warnings
- Duration

## Configuration

### Environment Variables

Required in Convex deployment:
```bash
FUEL_FINDER_CLIENT_ID=your_client_id
FUEL_FINDER_CLIENT_SECRET=your_client_secret
FUEL_FINDER_API_URL=https://www.fuel-finder.service.gov.uk/api/v1
FUEL_FINDER_TOKEN_URL=https://www.fuel-finder.service.gov.uk/api/v1/oauth/generate_access_token
```

Required in Vercel (for cron jobs):
```bash
CONVEX_URL=https://your-deployment.convex.cloud
CRON_SECRET=your_secret_key
```

## First Time Setup

1. **Deploy to Convex:**
   ```bash
   npx convex deploy
   ```

2. **Set Convex environment variables:**
   ```bash
   npx convex env set FUEL_FINDER_CLIENT_ID "your_id"
   npx convex env set FUEL_FINDER_CLIENT_SECRET "your_secret"
   ```

3. **Run initial station sync:**
   ```bash
   curl http://localhost:3000/api/manual-import?type=stations
   ```

4. **Run initial price sync:**
   ```bash
   curl http://localhost:3000/api/manual-import?type=prices
   ```

5. **Verify data:**
   - Check Convex dashboard for stations and prices
   - Check `syncLog` table for successful syncs

## Troubleshooting

### No prices synced
- **Cause:** Stations not in database
- **Solution:** Run `syncStations` first

### OAuth failures
- **Cause:** Invalid credentials or token URL
- **Solution:** Verify environment variables in Convex

### API rate limits
- **Cause:** Too many requests
- **Solution:** Adjust cron schedule frequency

### Stale data
- **Cause:** Cron not running or failing
- **Solution:** Check Vercel cron logs and sync history

## Future Improvements

- [ ] Add retry logic with exponential backoff
- [ ] Implement webhook support for real-time updates
- [ ] Add monitoring/alerting for failed syncs
- [ ] Support multiple fuel type filters
- [ ] Add geospatial indexing for location queries
