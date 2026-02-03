/**
 * Manual trigger endpoint for testing the fuel data import from API
 * 
 * Usage: 
 * - Local: http://localhost:3000/api/manual-import
 * - Local with type: http://localhost:3000/api/manual-import?type=stations
 * - Production: https://your-domain.vercel.app/api/manual-import?type=prices
 * 
 * Query params:
 * - type: "stations" | "prices" | "both" (default: "both")
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  // Allow both GET and POST
  if (request.method !== 'GET' && request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();
  
  // Get sync type from query params
  const syncType = (request.query.type as string) || 'both';
  
  console.log(`\n🔄 Manual fuel data sync triggered: ${syncType}`);
  console.log('='.repeat(60));

  try {
    // Get Convex URL from environment
    const CONVEX_URL = process.env.CONVEX_URL || process.env.VITE_CONVEX_URL;
    if (!CONVEX_URL) {
      throw new Error('CONVEX_URL not configured in environment variables');
    }

    const client = new ConvexHttpClient(CONVEX_URL);

    let stationsResult: any = null;
    let pricesResult: any = null;

    if (syncType === 'stations' || syncType === 'both') {
      console.log('🏪 Syncing station metadata from API...');
      stationsResult = await client.action(api.sync.syncStations, {});
      console.log(`✅ Stations: ${stationsResult.stationsProcessed || 0} synced`);
    }

    if (syncType === 'prices' || syncType === 'both') {
      console.log('\n⛽ Syncing price data from API...');
      pricesResult = await client.action(api.sync.syncPrices, {});
      console.log(`✅ Prices: ${pricesResult.pricesProcessed || 0} synced`);
      if (pricesResult.stationsNotFound) {
        console.log(`⚠️  ${pricesResult.stationsNotFound} prices skipped (stations not in DB)`);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n' + '='.repeat(60));
    console.log('✅ Manual sync complete!');
    if (stationsResult) {
      console.log(`📍 Stations: ${stationsResult.stationsProcessed || 0}`);
    }
    if (pricesResult) {
      console.log(`⛽ Prices: ${pricesResult.pricesProcessed || 0}`);
    }
    console.log(`⏱️  Duration: ${duration}s`);
    console.log('='.repeat(60) + '\n');

    return response.status(200).json({
      success: true,
      syncType,
      stationsProcessed: stationsResult?.stationsProcessed || 0,
      pricesProcessed: pricesResult?.pricesProcessed || 0,
      stationsNotFound: pricesResult?.stationsNotFound || 0,
      duration: `${duration}s`,
      timestamp: new Date().toISOString(),
    });

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
