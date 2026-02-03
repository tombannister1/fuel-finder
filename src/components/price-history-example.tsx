import * as React from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { PriceHistoryGraph } from './price-history-graph';
import { Button } from '@/components/ui/button';
import { SearchIcon, MapPinIcon, Info, Sparkles, Clock, TrendingUp, Loader2 } from 'lucide-react';
import { BrandLogo } from '@/lib/brand-logos';

export function PriceHistoryExample() {
  const [searchQuery, setSearchQuery] = React.useState('WF9');
  const [activeSearch, setActiveSearch] = React.useState<string | null>(null);
  const [selectedStation, setSelectedStation] = React.useState<{
    id: Id<'stations'>;
    name: string;
  } | null>(null);

  const stations = useQuery(
    api.stations.searchByLocation,
    activeSearch ? { query: activeSearch, limit: 10 } : 'skip'
  );

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setActiveSearch(searchQuery.trim());
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="text-center py-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Fuel Price History</h1>
        <p className="text-muted-foreground mt-2">Track fuel price changes over time</p>
      </div>

      {/* Station Search Card */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border/50">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <SearchIcon className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Find a Station</h2>
          </div>
          <p className="text-sm text-muted-foreground ml-11">
            Search by postcode, city, or town
          </p>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <MapPinIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Enter postcode, city, or town..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full h-12 pl-12 pr-4 bg-secondary/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
            </div>
            <Button 
              onClick={handleSearch}
              className="h-12 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl"
            >
              <SearchIcon className="w-5 h-5 sm:mr-2" />
              <span className="hidden sm:inline">Search</span>
            </Button>
          </div>

          {/* Station Results */}
          {stations && stations.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Found {stations.length} station{stations.length !== 1 ? 's' : ''}
              </p>
              <div className="space-y-2">
                {stations.slice(0, 5).map((station) => (
                  <button
                    key={station._id}
                    onClick={() => setSelectedStation({ id: station._id, name: station.name })}
                    className={`w-full rounded-xl p-3 text-left transition-all ${
                      selectedStation?.id === station._id
                        ? 'bg-primary/20 ring-1 ring-primary'
                        : 'bg-secondary/30 hover:bg-secondary/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {station.brand && <BrandLogo brand={station.brand} size="sm" />}
                      <span className="font-medium text-foreground">{station.name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {station.addressLine1}, {station.city}, {station.postcode}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {stations && stations.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              No stations found for "{activeSearch}"
            </div>
          )}

          {activeSearch && stations === undefined && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          )}
        </div>
      </div>

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
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Info className="w-4 h-4 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">How It Works</h2>
            </div>
          </div>

          <div className="p-4 sm:p-5 space-y-4">
            <div className="flex items-start gap-3 p-3 bg-secondary/30 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-chart-1/20 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4 text-chart-1" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">Price Tracking</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Prices are recorded regularly, creating a time-series dataset for trend analysis.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-secondary/30 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-chart-2/20 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-chart-2" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">Update Frequency</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Data syncs every 30 minutes, giving you ~48 data points per day for detailed analysis.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-secondary/30 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-chart-3/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-chart-3" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">What You Can See</h3>
                <ul className="text-sm text-muted-foreground mt-0.5 space-y-1">
                  <li>• Price trends (hourly, daily, weekly)</li>
                  <li>• Min, max, and average prices</li>
                  <li>• Historical data for all fuel types</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
