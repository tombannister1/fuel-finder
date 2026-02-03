# Quick Start Guide - API-Based Fuel Data Sync

This guide will help you transition from CSV-based imports to the new API-based sync system.

## What Changed?

✅ **Before:** Manually fetching and processing CSV files  
✅ **After:** Automated API sync using two efficient endpoints

## Prerequisites

1. **UK Fuel Finder API Credentials**
   - Register at: https://www.developer.fuel-finder.service.gov.uk/
   - Get your Client ID and Client Secret

2. **Convex Account**
   - Sign up at: https://dashboard.convex.dev/
   - Create a new project

## Setup Steps

### 1. Install Dependencies

```bash
pnpm install
```

This installs the new `@vercel/node` package required for the API endpoints.

### 2. Configure Convex Environment Variables

Set these in your Convex dashboard (Settings → Environment Variables):

```bash
FUEL_FINDER_CLIENT_ID=your_client_id_here
FUEL_FINDER_CLIENT_SECRET=your_client_secret_here
```

Or set them via CLI:

```bash
npx convex env set FUEL_FINDER_CLIENT_ID "your_client_id"
npx convex env set FUEL_FINDER_CLIENT_SECRET "your_client_secret"
```

### 3. Deploy Schema Updates

```bash
npx convex deploy
```

This deploys the new `syncState` table and updated `syncLog` schema.

### 4. Initial Data Population

Run the station sync first (one-time setup):

```bash
pnpm sync:stations
```

Wait for it to complete, then sync prices:

```bash
pnpm sync:prices
```

### 5. Verify Data

Check your Convex dashboard:
- `stations` table should have ~8,000+ entries
- `fuelPrices` table should have price records
- `syncLog` table should show completed syncs

## How It Works

### Sync Options

#### Option 1: Background Daemon (Recommended for Development)
Run continuously on your laptop for frequent updates:

```bash
pnpm sync:daemon
```

This runs in the background and syncs prices every 30 minutes automatically. Perfect for:
- Local development with fresh data
- More frequent updates than Vercel's free tier allows
- Avoiding IP blocking issues (runs from your local machine)

You can customize the interval:
```bash
pnpm sync:daemon -- 15  # Sync every 15 minutes
pnpm sync:daemon -- 60  # Sync every hour
```

Press `Ctrl+C` to stop the daemon.

#### Option 2: Vercel Cron (Production)
Automated sync runs daily at 1 AM UTC via Vercel cron job.

**Pros:**
- Fully automated (no laptop needed)
- Free on Vercel

**Cons:**
- Limited to daily syncs on free tier
- Prices updated once per day only

### Two Sync Types

#### 1. Station Sync (Manual/Weekly)
- **What:** Fetches all station metadata
- **Manual:** `pnpm sync:stations`
- **Why:** Station details rarely change

#### 2. Price Sync (Automatic)
- **What:** Fetches current fuel prices for all stations
- **When:** 
  - Every 30 mins via daemon (`pnpm sync:daemon`)
  - Daily at 1 AM UTC via Vercel cron (production)
- **Manual:** `pnpm sync:prices`
- **Why:** Prices change frequently, need fresh data

## Testing Locally

### Manual Sync Commands

```bash
# Sync stations (one-time or when stations need updating)
pnpm sync:stations

# Sync prices only
pnpm sync:prices

# Sync both
pnpm sync:all

# Run background daemon (syncs prices every 30 mins)
pnpm sync:daemon
```

### Expected Output

**Station sync:**
```
✅ Synced batch 14/14
✅ Successfully synced 8234 stations
⏱️  Total time: 45.2s
```

**Price sync:**
```
✅ Fetched 10615 stations with prices
✅ Found 8234 matching stations in database
✅ Sync complete: 15432 prices in 23.1s
```

**Daemon:**
```
🚀 Fuel Price Sync Daemon Starting...
📅 Sync interval: 30 minutes
🔄 Press Ctrl+C to stop
[Run #1] 2/3/2026, 10:30:00 AM
✅ Sync complete: 15432 prices in 23.1s
⏰ Next sync in 30 minutes...
```

## Production Deployment

### 1. Deploy to Convex

```bash
npx convex deploy --prod
```

### 2. Set Production Environment Variables

In Convex dashboard (Production environment):
```bash
FUEL_FINDER_CLIENT_ID=your_prod_client_id
FUEL_FINDER_CLIENT_SECRET=your_prod_client_secret
```

### 3. Deploy to Vercel

```bash
vercel --prod
```

Set these environment variables in Vercel:
```bash
CONVEX_URL=https://your-prod-deployment.convex.cloud
CRON_SECRET=generate_a_random_secret_here
```

### 4. Verify Cron Job

Check Vercel dashboard → Settings → Cron Jobs:
- Should show `/api/cron/import-fuel-data` running every 30 minutes
- Check logs to verify successful runs

## Monitoring

### View Sync History

In Convex dashboard, query the `syncLog` table:

```typescript
// Get recent syncs
const syncs = await ctx.db
  .query("syncLog")
  .order("desc")
  .take(10);
```

Or use the built-in query:

```typescript
import { api } from "./convex/_generated/api";

// In your React component
const recentSyncs = useQuery(api.sync.getRecentSyncs, { limit: 10 });
```

### Check Last Sync Times

```typescript
const lastStationSync = useQuery(api.sync.getLastSuccessfulSync, {
  syncType: "stations"
});

const lastPriceSync = useQuery(api.sync.getLastSuccessfulSync, {
  syncType: "prices"
});
```

## Troubleshooting

### "No prices synced"
**Cause:** Stations not in database yet  
**Solution:** Run station sync first
```bash
curl http://localhost:3000/api/manual-import?type=stations
```

### "OAuth failed: 401"
**Cause:** Invalid or missing credentials  
**Solution:** Check Convex environment variables
```bash
npx convex env list
```

### "stationsNotFound: 123"
**Cause:** API returned prices for stations not in our DB  
**Solution:** Run a full station refresh
```bash
curl http://localhost:3000/api/manual-import?type=stations
```

### Cron not running
**Cause:** Missing CRON_SECRET or incorrect Vercel configuration  
**Solution:** 
1. Set `CRON_SECRET` in Vercel environment variables
2. Check `vercel.json` exists with cron configuration
3. Redeploy to Vercel

## Old CSV Import

The old CSV-based import is still available if needed, but it's recommended to use the API:

```bash
# Legacy CSV import (not recommended)
curl http://localhost:3000/api/cron/import-fuel-data \
  -H "Authorization: Bearer $CRON_SECRET"
```

To fully remove CSV support, you can delete:
- `public/UpdatedFuelPrice-*.csv`
- Related CSV parsing logic (optional)

## Benefits of New Approach

| Metric | Old (CSV) | New (API) |
|--------|-----------|-----------|
| Data freshness | Manual update | 30 minutes |
| Station updates | Manual | Weekly auto |
| Price updates | Full reload | Incremental |
| Sync duration | 45-60s | 10-20s |
| Bandwidth usage | High | Low |
| API calls | N/A | Optimized |

## Next Steps

1. ✅ Install dependencies: `pnpm install`
2. ✅ Configure Convex environment variables
3. ✅ Deploy schema: `npx convex deploy`
4. ✅ Run initial station sync
5. ✅ Run initial price sync
6. ✅ Verify data in Convex dashboard
7. ✅ Deploy to production
8. ✅ Set up monitoring

## Support

- **API Issues:** Contact UK Fuel Finder support
- **Convex Issues:** Check Convex documentation or Discord
- **Application Issues:** Check logs in Convex/Vercel dashboards

For detailed technical documentation, see:
- [API_SYNC_STRATEGY.md](./docs/API_SYNC_STRATEGY.md) - Architecture details
- [README.md](./README.md) - General setup
