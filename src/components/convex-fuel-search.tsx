import * as React from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  SearchIcon,
  MapPinIcon,
  FuelIcon,
  AlertCircleIcon,
  TrendingDown,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  MapIcon,
  ListIcon,
  Navigation,
  Bookmark,
  Loader2,
  Sparkles,
  Target,
  Clock,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BrandLogo } from '@/lib/brand-logos';
import { FuelMapView } from './fuel-map-view-client';
import { StationFiltersPanel } from './station-filters';
import { useGeolocation } from '@/hooks/use-geolocation';
import { useUserPreferences } from '@/hooks/use-local-storage';
import { useStationFilters } from '@/hooks/use-station-filters';

type FuelType = 'E5' | 'E10' | 'Diesel' | 'Super Diesel' | 'B10' | 'HVO';

const fuelTypes: { label: string; value: FuelType }[] = [
  { label: 'E10 (Regular)', value: 'E10' },
  { label: 'E5 (Super)', value: 'E5' },
  { label: 'Diesel', value: 'Diesel' },
  { label: 'Super Diesel', value: 'Super Diesel' },
  { label: 'B10 (Bio)', value: 'B10' },
  { label: 'HVO', value: 'HVO' },
];

const radiusOptions = [
  { label: '2 mi', value: 2 },
  { label: '5 mi', value: 5 },
  { label: '10 mi', value: 10 },
  { label: '15 mi', value: 15 },
  { label: '25 mi', value: 25 },
];

export function ConvexFuelSearch() {
  const { preferences, updatePreference, saveLocation, isInitialized } = useUserPreferences();
  
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeSearch, setActiveSearch] = React.useState<string | null>(null);
  const [fuelType, setFuelType] = React.useState<FuelType>('E10');
  const [radius, setRadius] = React.useState<number>(5);
  const [centerPoint, setCenterPoint] = React.useState<{ lat: number; lng: number } | null>(null);
  const [viewMode, setViewMode] = React.useState<'list' | 'map'>('list');
  const [hideNoPrices, setHideNoPrices] = React.useState<boolean>(true);
  
  const { latitude, longitude, error: geoError, loading: geoLoading, requestLocation, isSupported } = useGeolocation();

  // Track if we've done the initial sync
  const hasSyncedRef = React.useRef(false);

  // Sync with localStorage after hydration - only once
  React.useEffect(() => {
    if (isInitialized && !hasSyncedRef.current) {
      hasSyncedRef.current = true;
      if (preferences.preferredFuelType) {
        setFuelType(preferences.preferredFuelType as FuelType);
      }
      if (preferences.preferredRadius) {
        setRadius(preferences.preferredRadius);
      }
      if (preferences.preferredView) {
        setViewMode(preferences.preferredView);
      }
    }
  }, [isInitialized, preferences.preferredFuelType, preferences.preferredRadius, preferences.preferredView]);

  const locationMatches = useQuery(
    api.stations.searchByLocation,
    activeSearch ? { query: activeSearch, limit: 1 } : 'skip'
  );

  const stations = useQuery(
    api.stations.searchByRadius,
    centerPoint ? {
      latitude: centerPoint.lat,
      longitude: centerPoint.lng,
      radiusMiles: radius,
      limit: 100,
    } : 'skip'
  );

  React.useEffect(() => {
    if (locationMatches && locationMatches.length > 0) {
      const firstMatch = locationMatches[0];
      const newCenter = {
        lat: firstMatch.latitude,
        lng: firstMatch.longitude,
      };
      setCenterPoint(newCenter);
      saveLocation(newCenter.lat, newCenter.lng, firstMatch.postcode);
    }
  }, [locationMatches, saveLocation]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setCenterPoint(null);
    setActiveSearch(searchQuery.trim().toUpperCase());
  };

  const handleUseMyLocation = () => {
    requestLocation();
  };

  React.useEffect(() => {
    if (latitude && longitude) {
      const newCenter = { lat: latitude, lng: longitude };
      setCenterPoint(newCenter);
      setActiveSearch('Your Location');
      setSearchQuery('Your Location');
      saveLocation(latitude, longitude, 'Current Location');
    }
  }, [latitude, longitude, saveLocation]);

  React.useEffect(() => {
    if (isInitialized && preferences.rememberLocation && preferences.lastLocation && !activeSearch) {
      const { latitude: lat, longitude: lng, address } = preferences.lastLocation;
      setCenterPoint({ lat, lng });
      setActiveSearch(address || 'Saved Location');
      setSearchQuery(address || 'Saved Location');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized]);

  React.useEffect(() => {
    if (isInitialized && hasSyncedRef.current && preferences.preferredFuelType !== fuelType) {
      updatePreference('preferredFuelType', fuelType);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fuelType, isInitialized]);

  React.useEffect(() => {
    if (isInitialized && hasSyncedRef.current && preferences.preferredRadius !== radius) {
      updatePreference('preferredRadius', radius);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radius, isInitialized]);

  React.useEffect(() => {
    if (isInitialized && hasSyncedRef.current && preferences.preferredView !== viewMode) {
      updatePreference('preferredView', viewMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, isInitialized]);

  const formatPrice = (price: number) => {
    return `£${(price / 100).toFixed(2)}`;
  };

  const allStations = stations || [];
  const {
    filters,
    filteredStations,
    availableBrands,
    priceRange,
    toggleBrand,
    updateFilter,
    resetFilters,
    hasActiveFilters,
    filterCount,
    totalCount,
  } = useStationFilters(allStations, new Map(), fuelType);

  const isLoading = activeSearch && (locationMatches === undefined || stations === undefined);
  const hasResults = filteredStations.length > 0;
  const noResults = activeSearch && !isLoading && !hasResults;

  return (
    <div className="w-full space-y-4 sm:space-y-6" suppressHydrationWarning>
      {/* Search Card */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Search Header */}
        <div className="p-4 sm:p-5 border-b border-border/50">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <SearchIcon className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Find Fuel</h2>
          </div>
          <p className="text-sm text-muted-foreground ml-11">
            Search by postcode, city, or address
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="p-4 sm:p-5 space-y-4">
          {/* Location Input */}
          <div className="relative">
            <MapPinIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Postcode, city, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 sm:h-14 pl-12 pr-4 bg-secondary/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            />
          </div>

          {/* Fuel Type & Radius - Mobile Stacked, Desktop Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Fuel Type</label>
              <Select
                items={fuelTypes}
                value={fuelType}
                onValueChange={(value) => setFuelType(value as FuelType)}
              >
                <SelectTrigger className="h-11 bg-secondary/50 border-border">
                  <FuelIcon className="w-4 h-4 text-muted-foreground mr-2" />
                  <SelectValue placeholder="Fuel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {fuelTypes.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Radius</label>
              <Select
                items={radiusOptions}
                value={radius.toString()}
                onValueChange={(value) => setRadius(parseInt(value))}
              >
                <SelectTrigger className="h-11 bg-secondary/50 border-border">
                  <Target className="w-4 h-4 text-muted-foreground mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {radiusOptions.map((item) => (
                      <SelectItem key={item.value} value={item.value.toString()}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl glow-primary"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <SearchIcon className="w-5 h-5 mr-2" />
                  Search
                </>
              )}
            </Button>
            
            {isSupported && (
              <Button
                type="button"
                variant="outline"
                onClick={handleUseMyLocation}
                disabled={geoLoading || isLoading}
                className="h-12 px-4 border-border bg-secondary/50 hover:bg-secondary rounded-xl"
              >
                {geoLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Navigation className="w-5 h-5" />
                )}
              </Button>
            )}
          </div>

          {/* Remember Location Toggle */}
          {isInitialized && (
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.rememberLocation}
                  onChange={(e) => updatePreference('rememberLocation', e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Bookmark className="w-3.5 h-3.5" />
                  Remember location
                </span>
              </label>
              {preferences.rememberLocation && preferences.lastLocation && (
                <Badge variant="outline" className="text-xs bg-secondary/50">
                  {preferences.lastLocation.address}
                </Badge>
              )}
            </div>
          )}
          
          {geoError && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive">
              <AlertCircleIcon className="w-4 h-4 shrink-0" />
              {geoError}
            </div>
          )}
        </form>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="bg-card border border-border rounded-2xl p-8">
          <div className="flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Finding stations...</p>
          </div>
        </div>
      )}

      {/* No Results */}
      {noResults && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertCircleIcon className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">No stations found</p>
              <p className="text-sm text-muted-foreground">
                Try a different location or increase the search radius.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {hasResults && (
        <div className="space-y-4">
          {/* Results Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-card border border-border rounded-2xl">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {filteredStations.length} station{filteredStations.length !== 1 ? 's' : ''}
              </h3>
              <p className="text-sm text-muted-foreground">
                Within {radius} miles of {locationMatches?.[0]?.postcode || activeSearch}
              </p>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              {/* Hide No Prices Toggle */}
              <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-lg">
                <input
                  type="checkbox"
                  checked={hideNoPrices}
                  onChange={(e) => setHideNoPrices(e.target.checked)}
                  className="w-3.5 h-3.5 rounded"
                />
                Hide no prices
              </label>
              
              {/* View Toggle */}
              <div className="flex bg-secondary/50 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'list'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <ListIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'map'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <MapIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Filters Panel */}
          <StationFiltersPanel
            filters={filters}
            availableBrands={availableBrands}
            priceRange={priceRange}
            onToggleBrand={toggleBrand}
            onUpdateFilter={updateFilter}
            onReset={resetFilters}
            hasActiveFilters={hasActiveFilters}
            filterCount={filterCount}
            totalCount={totalCount}
          />

          {/* Map View */}
          {viewMode === 'map' && centerPoint && (
            <FuelMapView
              stations={filteredStations}
              centerPoint={centerPoint}
              userLocation={latitude && longitude ? { lat: latitude, lng: longitude } : null}
              radius={radius}
              selectedFuelType={fuelType}
            />
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <div className="space-y-3">
              {filteredStations.map((station, index) => (
                <StationCard 
                  key={station._id} 
                  station={station} 
                  selectedFuelType={fuelType}
                  index={index}
                  hideIfNoPrices={hideNoPrices}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Initial State */}
      {!activeSearch && (
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-10">
          <div className="max-w-md mx-auto text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Find Cheap Fuel
              </h3>
              <p className="text-muted-foreground">
                Compare prices at 6,700+ UK stations
              </p>
            </div>
            
            <div className="grid grid-cols-3 gap-4 pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">6</div>
                <div className="text-xs text-muted-foreground">Fuel Types</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">30d</div>
                <div className="text-xs text-muted-foreground">History</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">25mi</div>
                <div className="text-xs text-muted-foreground">Max Range</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Station Card Component
function StationCard({ 
  station, 
  selectedFuelType,
  index,
  hideIfNoPrices = false,
}: { 
  station: any; 
  selectedFuelType: FuelType;
  index: number;
  hideIfNoPrices?: boolean;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const prices = useQuery(api.fuelPrices.getCurrentPrices, { stationId: station._id });
  const priceHistory = useQuery(
    api.fuelPrices.getPriceHistory,
    expanded ? { stationId: station._id, fuelType: selectedFuelType, daysBack: 30 } : 'skip'
  );

  const formatPrice = (price: number) => `£${(price / 100).toFixed(2)}`;
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    });
  };

  const hasPrices = prices && prices.length > 0;
  
  if (hideIfNoPrices && !hasPrices) {
    return null;
  }
  
  const highlightedPrice = hasPrices ? prices.find(p => p.fuelType === selectedFuelType) : null;
  const sortedPrices = hasPrices ? [...prices].sort((a, b) => {
    if (a.fuelType === selectedFuelType) return -1;
    if (b.fuelType === selectedFuelType) return 1;
    return 0;
  }) : [];

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden card-hover">
      {/* Station Header */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Rank Badge */}
          {index < 3 && (
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
              index === 0 ? 'bg-yellow-500/20 text-yellow-500' :
              index === 1 ? 'bg-zinc-400/20 text-zinc-400' :
              'bg-amber-600/20 text-amber-600'
            }`}>
              {index + 1}
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {station.brand && <BrandLogo brand={station.brand} size="sm" />}
              <h4 className="font-semibold text-foreground truncate">{station.name}</h4>
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {station.addressLine1}{station.city && `, ${station.city}`}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs bg-secondary/50">
                {station.distance.toFixed(1)} mi
              </Badge>
              {highlightedPrice && (
                <Badge className="bg-primary/20 text-primary border-0 text-xs font-semibold">
                  {selectedFuelType}: {formatPrice(highlightedPrice.price)}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Prices Grid */}
      {hasPrices && (
        <div className="px-4 pb-4 space-y-3">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {sortedPrices.map((price) => (
              <div
                key={price.fuelType}
                className={`rounded-xl p-2.5 text-center transition-all ${
                  price.fuelType === selectedFuelType
                    ? 'bg-primary/20 ring-1 ring-primary'
                    : 'bg-secondary/50'
                }`}
              >
                <div className="text-[10px] text-muted-foreground mb-0.5">{price.fuelType}</div>
                <div className="text-sm font-bold text-foreground">{formatPrice(price.price)}</div>
              </div>
            ))}
          </div>

          {/* Expand Button */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full py-2.5 text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-2 bg-secondary/30 hover:bg-secondary/50 rounded-xl transition-all"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Hide History
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                30-Day History
              </>
            )}
          </button>

          {/* Price History Chart */}
          {expanded && (
            <div className="pt-3 border-t border-border/50">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  {selectedFuelType} Price History
                </span>
              </div>
              {priceHistory && priceHistory.length > 0 ? (
                <PriceHistoryChart data={priceHistory} fuelType={selectedFuelType} />
              ) : (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  {priceHistory === undefined ? (
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  ) : (
                    'No history available'
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* No Prices State */}
      {!hasPrices && (
        <div className="px-4 pb-4">
          <div className="text-center py-4 text-muted-foreground text-sm bg-secondary/30 rounded-xl">
            <AlertCircleIcon className="w-5 h-5 mx-auto mb-1 opacity-50" />
            No price data available
          </div>
        </div>
      )}
    </div>
  );
}

// Price History Chart
function PriceHistoryChart({ data, fuelType }: { data: any[], fuelType: string }) {
  const chartData = data
    .map((item) => ({
      date: new Date(item.recordedAt).toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'short' 
      }),
      price: item.price / 100,
      timestamp: item.recordedAt,
    }))
    .sort((a, b) => a.timestamp - b.timestamp);

  const minPrice = Math.min(...chartData.map(d => d.price));
  const maxPrice = Math.max(...chartData.map(d => d.price));
  const avgPrice = chartData.reduce((sum, d) => sum + d.price, 0) / chartData.length;
  const priceChange = chartData.length > 1 ? chartData[chartData.length - 1].price - chartData[0].price : 0;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-secondary/50 p-3 rounded-xl text-center">
          <div className="text-[10px] text-muted-foreground mb-0.5">Low</div>
          <div className="text-sm font-semibold text-foreground">£{minPrice.toFixed(2)}</div>
        </div>
        <div className="bg-secondary/50 p-3 rounded-xl text-center">
          <div className="text-[10px] text-muted-foreground mb-0.5">Avg</div>
          <div className="text-sm font-semibold text-foreground">£{avgPrice.toFixed(2)}</div>
        </div>
        <div className="bg-secondary/50 p-3 rounded-xl text-center">
          <div className="text-[10px] text-muted-foreground mb-0.5">High</div>
          <div className="text-sm font-semibold text-foreground">£{maxPrice.toFixed(2)}</div>
        </div>
      </div>

      {/* Trend Indicator */}
      {priceChange !== 0 && (
        <div className={`flex items-center justify-center gap-2 p-2.5 rounded-xl text-sm font-medium ${
          priceChange > 0 
            ? 'bg-destructive/10 text-destructive' 
            : 'bg-primary/10 text-primary'
        }`}>
          {priceChange > 0 ? (
            <><TrendingUp className="w-4 h-4" /> Up £{Math.abs(priceChange).toFixed(2)}</>
          ) : (
            <><TrendingDown className="w-4 h-4" /> Down £{Math.abs(priceChange).toFixed(2)}</>
          )}
          <span className="text-xs opacity-70">in 30 days</span>
        </div>
      )}

      {/* Chart */}
      <div className="bg-secondary/30 p-3 rounded-xl">
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }}
              stroke="rgba(255,255,255,0.1)"
            />
            <YAxis 
              domain={[minPrice - 0.02, maxPrice + 0.02]}
              tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }}
              stroke="rgba(255,255,255,0.1)"
              tickFormatter={(value) => `£${value.toFixed(2)}`}
              width={50}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(24,24,27,0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#fff'
              }}
              formatter={(value: any) => [`£${value.toFixed(2)}`, fuelType]}
            />
            <Line 
              type="monotone" 
              dataKey="price" 
              stroke="oklch(0.65 0.22 145)"
              strokeWidth={2}
              dot={{ fill: 'oklch(0.65 0.22 145)', r: 2 }}
              activeDot={{ r: 4, fill: 'oklch(0.65 0.22 145)' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
