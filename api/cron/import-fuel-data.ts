/**
 * Vercel Cron Job: Import fuel price data from API to Convex
 * 
 * Strategy:
 * - Syncs incremental price updates every 30 minutes (lightweight)
 * - Full station sync runs weekly (on Sundays at 2 AM)
 * 
 * URL: /api/cron/import-fuel-data
 * Schedule: Every 30 minutes (cron: 0,30 * * * *)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  // Verify this is a cron request (Vercel adds this header)
  const authHeader = request.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.log('❌ Unauthorized cron request');
    return response.status(401).json({ error: 'Unauthorized' });
  }

  const startTime = Date.now();
  console.log('\n🔄 Starting scheduled fuel data sync...');
  console.log('='.repeat(60));

  try {
    // Get Convex URL from environment
    const CONVEX_URL = process.env.CONVEX_URL || process.env.VITE_CONVEX_URL;
    if (!CONVEX_URL) {
      throw new Error('CONVEX_URL not configured');
    }

    const client = new ConvexHttpClient(CONVEX_URL);

    // Determine sync type based on day/time
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday
    const hour = now.getHours();
    
    // Full station sync: Sundays at 2 AM (or if never synced)
    const shouldSyncStations = dayOfWeek === 0 && hour === 2;
    
    let result: any;
    
    if (shouldSyncStations) {
      console.log('🏪 Running FULL station metadata sync (weekly)...');
      result = await client.action(api.sync.syncStations, {});
      
      // After station sync, also sync prices
      console.log('\n⛽ Following up with price sync...');
      const priceResult = await client.action(api.sync.syncPrices, {});
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log('\n' + '='.repeat(60));
      console.log('✅ Full sync complete!');
      console.log(`📍 Stations synced: ${result.stationsProcessed || 0}`);
      console.log(`⛽ Prices synced: ${priceResult.pricesProcessed || 0}`);
      console.log(`⏱️  Duration: ${duration}s`);
      console.log('='.repeat(60) + '\n');

      return response.status(200).json({
        success: true,
        syncType: 'full',
        stationsProcessed: result.stationsProcessed || 0,
        pricesProcessed: priceResult.pricesProcessed || 0,
        duration: `${duration}s`,
        timestamp: new Date().toISOString(),
      });
    } else {
      console.log('⛽ Running INCREMENTAL price sync (regular)...');
      result = await client.action(api.sync.syncPrices, {});
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log('\n' + '='.repeat(60));
      console.log('✅ Price sync complete!');
      console.log(`⛽ Prices updated: ${result.pricesProcessed || 0}`);
      if (result.stationsNotFound) {
        console.log(`⚠️  Prices skipped (no station): ${result.stationsNotFound}`);
      }
      console.log(`⏱️  Duration: ${duration}s`);
      console.log('='.repeat(60) + '\n');

      return response.status(200).json({
        success: true,
        syncType: 'prices',
        pricesProcessed: result.pricesProcessed || 0,
        stationsNotFound: result.stationsNotFound || 0,
        duration: `${duration}s`,
        timestamp: new Date().toISOString(),
      });
    }

  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error('\n❌ Sync failed:', error);
    console.log(`⏱️  Duration: ${duration}s\n`);
    
    return response.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}s`,
      timestamp: new Date().toISOString(),
    });
  }
}
