/**
 * Example component showing Convex-powered fuel price search
 * with historical tracking
 * 
 * This demonstrates the recommended approach using Convex
 */

import * as React from 'react';
import {
  useStationsByPostcode,
  useSyncByPostcode,
  useCurrentPrices,
  usePriceHistory,
} from '@/hooks/use-convex-fuel-finder';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SearchIcon, RefreshCwIcon, TrendingDownIcon, TrendingUpIcon } from 'lucide-react';
import type { Id } from '../../convex/_generated/dataModel';

export function ConvexFuelFinderExample() {
  const [postcode, setPostcode] = React.useState('');
  const [searchPostcode, setSearchPostcode] = React.useState<string | null>(null);
  const [isSyncing, setIsSyncing] = React.useState(false);

  // Query local Convex data
  const stations = useStationsByPostcode(searchPostcode, 50);
  
  // Sync action to fetch from API
  const syncByPostcode = useSyncByPostcode();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postcode.trim()) return;
    
    setSearchPostcode(postcode);
  };

  const handleSync = async () => {
    if (!searchPostcode) return;
    
    setIsSyncing(true);
    try {
      const result = await syncByPostcode(searchPostcode, {
        radius: 5,
      });
      
      if (result.success) {
        console.log(`✅ Synced ${result.stationsProcessed} stations`);
      } else {
        console.error('❌ Sync failed:', result.error);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-sync if no data found
  React.useEffect(() => {
    if (searchPostcode && stations && stations.length === 0 && !isSyncing) {
      handleSync();
    }
  }, [searchPostcode, stations]);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle>Convex-Powered Fuel Finder</CardTitle>
          <CardDescription>
            Search with local cached data and historical price tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch}>
            <FieldGroup>
              <div className="flex gap-3">
                <Field className="flex-1">
                  <FieldLabel htmlFor="postcode">Postcode</FieldLabel>
                  <Input
                    id="postcode"
                    placeholder="e.g. SW1A 1AA"
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value)}
                    required
                  />
                </Field>
                <div className="flex items-end gap-2">
                  <Button type="submit">
                    <SearchIcon className="w-4 h-4 mr-2" />
                    Search
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSync}
                    disabled={!searchPostcode || isSyncing}
                  >
                    <RefreshCwIcon className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Syncing...' : 'Sync'}
                  </Button>
                </div>
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      {stations && stations.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">
              {stations.length} Stations Found
            </h2>
            <Badge variant="outline">
              Cached locally
            </Badge>
          </div>

          <div className="grid gap-4">
            {stations.map((station) => (
              <StationCard key={station._id} stationId={station._id} station={station} />
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {searchPostcode && stations && stations.length === 0 && !isSyncing && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No stations found. Try syncing from the API.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Station card with current prices and historical data
 */
function StationCard({ 
  stationId, 
  station 
}: { 
  stationId: Id<'stations'>;
  station: any;
}) {
  const currentPrices = useCurrentPrices(stationId);
  const [showHistory, setShowHistory] = React.useState(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">
              {station.name}
              {station.brand && (
                <Badge variant="secondary" className="ml-2">
                  {station.brand}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {station.addressLine1}, {station.city} • {station.postcode}
            </CardDescription>
          </div>
          <Badge variant="outline">
            {new Date(station.lastSyncedAt).toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Prices */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {currentPrices?.map((price) => (
            <div
              key={price._id}
              className="rounded-lg border p-3 bg-muted/50"
            >
              <div className="text-sm font-medium text-muted-foreground">
                {price.fuelType}
              </div>
              <div className="text-2xl font-bold">
                £{(price.price / 100).toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(price.recordedAt).toLocaleDateString('en-GB')}
              </div>
            </div>
          ))}
        </div>

        {/* Toggle History */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowHistory(!showHistory)}
        >
          {showHistory ? 'Hide' : 'Show'} Price History
        </Button>

        {/* Price History */}
        {showHistory && currentPrices && currentPrices.length > 0 && (
          <PriceHistory stationId={stationId} fuelType={currentPrices[0].fuelType} />
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Price history chart for a fuel type
 */
function PriceHistory({
  stationId,
  fuelType,
}: {
  stationId: Id<'stations'>;
  fuelType: 'E5' | 'E10' | 'Diesel' | 'Super Diesel' | 'B10' | 'HVO';
}) {
  const history = usePriceHistory(stationId, fuelType, 30); // Last 30 days

  if (!history || history.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No price history available yet
      </div>
    );
  }

  // Calculate price change
  const latestPrice = history[0].price;
  const oldestPrice = history[history.length - 1].price;
  const priceChange = latestPrice - oldestPrice;
  const percentChange = ((priceChange / oldestPrice) * 100).toFixed(1);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <h4 className="font-medium">Price History ({fuelType})</h4>
        <Badge variant={priceChange < 0 ? 'default' : 'secondary'}>
          {priceChange < 0 ? (
            <TrendingDownIcon className="w-3 h-3 mr-1" />
          ) : (
            <TrendingUpIcon className="w-3 h-3 mr-1" />
          )}
          {Math.abs(priceChange)}p ({percentChange}%)
        </Badge>
      </div>

      <div className="space-y-2">
        {history.slice(0, 5).map((price) => (
          <div
            key={price._id}
            className="flex items-center justify-between text-sm"
          >
            <span className="text-muted-foreground">
              {new Date(price.recordedAt).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            <span className="font-mono font-medium">
              £{(price.price / 100).toFixed(2)}
            </span>
          </div>
        ))}
        {history.length > 5 && (
          <div className="text-xs text-muted-foreground text-center">
            +{history.length - 5} more records
          </div>
        )}
      </div>
    </div>
  );
}
