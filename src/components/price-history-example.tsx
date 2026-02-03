import * as React from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { PriceHistoryGraph } from './price-history-graph';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { SearchIcon, MapPinIcon } from 'lucide-react';
import { BrandLogo } from '@/lib/brand-logos';

/**
 * Example component showing how to use the PriceHistoryGraph
 * 
 * This component:
 * 1. Searches for stations by postcode
 * 2. Displays the price history graph for selected station
 */
export function PriceHistoryExample() {
  const [searchQuery, setSearchQuery] = React.useState('WF9');
  const [activeSearch, setActiveSearch] = React.useState<string | null>(null);
  const [selectedStation, setSelectedStation] = React.useState<{
    id: Id<'stations'>;
    name: string;
  } | null>(null);

  // Search for stations
  const stations = useQuery(
    api.stations.searchByLocation,
    activeSearch
      ? {
          query: activeSearch,
          limit: 10,
        }
      : 'skip'
  );

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setActiveSearch(searchQuery.trim());
    }
  };

  return (
    <div className="container mx-auto max-w-6xl p-4 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold">Fuel Price History</h1>
        <p className="text-gray-600 mt-2">
          Track fuel price changes over time at any station
        </p>
      </div>

      {/* Station Search */}
      <Card>
        <CardHeader>
          <CardTitle>Find a Station</CardTitle>
          <CardDescription>
            Search by postcode, city, or town to view price history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel>Location</FieldLabel>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <MapPinIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Enter postcode, city, or town..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-10"
                  />
                </div>
                <Button onClick={handleSearch}>
                  <SearchIcon className="mr-2 h-4 w-4" />
                  Search
                </Button>
              </div>
            </Field>
          </FieldGroup>

          {/* Station Results */}
          {stations && stations.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-gray-700">
                Found {stations.length} station{stations.length !== 1 ? 's' : ''}
              </p>
              <div className="grid gap-2">
                {stations.slice(0, 5).map((station) => (
                  <button
                    key={station._id}
                    onClick={() =>
                      setSelectedStation({
                        id: station._id,
                        name: station.name,
                      })
                    }
                    className={`rounded-lg border p-3 text-left transition-colors hover:bg-gray-50 ${
                      selectedStation?.id === station._id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {station.brand && (
                        <BrandLogo brand={station.brand} size="sm" />
                      )}
                      <div className="font-medium">{station.name}</div>
                    </div>
                    <div className="text-sm text-gray-600">
                      {station.addressLine1}, {station.city}, {station.postcode}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {stations && stations.length === 0 && (
            <div className="mt-4 text-center text-gray-500">
              No stations found for "{activeSearch}"
            </div>
          )}
        </CardContent>
      </Card>

      {/* Price History Graph */}
      {selectedStation && (
        <PriceHistoryGraph
          stationId={selectedStation.id}
          stationName={selectedStation.name}
          defaultFuelType="E10"
        />
      )}

      {/* Instructions */}
      {!selectedStation && (
        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium">📊 Price Tracking</h3>
              <p className="text-sm text-gray-600">
                Every time you run <code className="bg-gray-100 px-2 py-1 rounded">pnpm sync:daemon</code>,
                the system records current prices. This creates a time-series dataset perfect for graphing.
              </p>
            </div>
            <div>
              <h3 className="font-medium">⏱️ Update Frequency</h3>
              <p className="text-sm text-gray-600">
                With the daemon running every 30 minutes, you get ~48 data points per day.
                The more frequently you sync, the more detailed your graphs!
              </p>
            </div>
            <div>
              <h3 className="font-medium">📈 What You Can See</h3>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                <li>Price trends over time (hourly, daily, weekly, monthly)</li>
                <li>Price spikes and drops</li>
                <li>Min, max, and average prices</li>
                <li>Price change percentage</li>
                <li>Historical data for all fuel types</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
