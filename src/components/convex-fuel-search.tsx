import * as React from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { SearchIcon, MapPinIcon, FuelIcon, AlertCircleIcon, TrendingDown, TrendingUp, Minus, ChevronDown, ChevronUp, MapIcon, ListIcon, Navigation, BookmarkIcon } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BrandLogo } from '@/lib/brand-logos';
import { FuelMapView } from './fuel-map-view-client';
import { StationFiltersPanel } from './station-filters';
import { useGeolocation } from '@/hooks/use-geolocation';
import { useUserPreferences } from '@/hooks/use-local-storage';
import { useStationFilters } from '@/hooks/use-station-filters';

type FuelType = 'E5' | 'E10' | 'Diesel' | 'Super Diesel' | 'B10' | 'HVO';

const fuelTypes: { label: string; value: FuelType }[] = [
  { label: 'E5 (Super Unleaded)', value: 'E5' },
  { label: 'E10 (Regular Unleaded)', value: 'E10' },
  { label: 'Diesel', value: 'Diesel' },
  { label: 'Super Diesel', value: 'Super Diesel' },
  { label: 'B10 (Biodiesel)', value: 'B10' },
  { label: 'HVO (Renewable Diesel)', value: 'HVO' },
];

const radiusOptions = [
  { label: '2 miles', value: 2 },
  { label: '5 miles', value: 5 },
  { label: '10 miles', value: 10 },
  { label: '15 miles', value: 15 },
  { label: '25 miles', value: 25 },
];

export function ConvexFuelSearch() {
  // User preferences
  const { preferences, updatePreference, saveLocation } = useUserPreferences();
  
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeSearch, setActiveSearch] = React.useState<string | null>(null);
  // Use consistent defaults to avoid hydration mismatch
  const [fuelType, setFuelType] = React.useState<FuelType>('E10');
  const [radius, setRadius] = React.useState<number>(5);
  const [centerPoint, setCenterPoint] = React.useState<{ lat: number; lng: number } | null>(null);
  const [viewMode, setViewMode] = React.useState<'list' | 'map'>('list');
  const [hideNoPrices, setHideNoPrices] = React.useState<boolean>(true); // Default to hiding stations without prices
  const [isHydrated, setIsHydrated] = React.useState(false);
  
  // Geolocation hook
  const { latitude, longitude, error: geoError, loading: geoLoading, requestLocation, isSupported } = useGeolocation();

  // Sync with localStorage after hydration to avoid mismatch
  React.useEffect(() => {
    setIsHydrated(true);
    if (preferences.preferredFuelType) {
      setFuelType(preferences.preferredFuelType as FuelType);
    }
    if (preferences.preferredRadius) {
      setRadius(preferences.preferredRadius);
    }
    if (preferences.preferredView) {
      setViewMode(preferences.preferredView);
    }
  }, []);

  // First query: Find location by text search
  const locationMatches = useQuery(
    api.stations.searchByLocation,
    activeSearch ? { query: activeSearch, limit: 1 } : 'skip'
  );

  // Second query: Get all stations within radius of that location
  const stations = useQuery(
    api.stations.searchByRadius,
    centerPoint ? {
      latitude: centerPoint.lat,
      longitude: centerPoint.lng,
      radiusMiles: radius,
      limit: 100,
    } : 'skip'
  );

  // When we get location matches, set the center point for radius search
  React.useEffect(() => {
    if (locationMatches && locationMatches.length > 0) {
      const firstMatch = locationMatches[0];
      const newCenter = {
        lat: firstMatch.latitude,
        lng: firstMatch.longitude,
      };
      setCenterPoint(newCenter);
      
      // Save location if preference is enabled
      saveLocation(newCenter.lat, newCenter.lng, firstMatch.postcode);
    }
  }, [locationMatches, saveLocation]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    // Reset center point and start new search
    setCenterPoint(null);
    setActiveSearch(searchQuery.trim().toUpperCase());
  };

  const handleUseMyLocation = () => {
    requestLocation();
  };

  // When user location is obtained, trigger a radius search
  React.useEffect(() => {
    if (latitude && longitude) {
      const newCenter = { lat: latitude, lng: longitude };
      setCenterPoint(newCenter);
      setActiveSearch('Your Location');
      setSearchQuery('Your Location');
      
      // Save location if preference is enabled
      saveLocation(latitude, longitude, 'Current Location');
    }
  }, [latitude, longitude, saveLocation]);

  // Load saved location on mount if preference is set
  React.useEffect(() => {
    if (preferences.rememberLocation && preferences.lastLocation && !activeSearch) {
      const { latitude: lat, longitude: lng, address } = preferences.lastLocation;
      setCenterPoint({ lat, lng });
      setActiveSearch(address || 'Saved Location');
      setSearchQuery(address || 'Saved Location');
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save preferences when they change (but avoid triggering on preference object changes)
  React.useEffect(() => {
    if (preferences.preferredFuelType !== fuelType) {
      updatePreference('preferredFuelType', fuelType);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fuelType]);

  React.useEffect(() => {
    if (preferences.preferredRadius !== radius) {
      updatePreference('preferredRadius', radius);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radius]);

  React.useEffect(() => {
    if (preferences.preferredView !== viewMode) {
      updatePreference('preferredView', viewMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  const formatPrice = (price: number) => {
    return `£${(price / 100).toFixed(2)}`;
  };

  const formatDate = (timestamp: number) => {
    try {
      return new Date(timestamp).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Unknown';
    }
  };

  // Station filtering
  // Note: We pass an empty price map since prices are loaded per-station
  // The hideNoPrices filter is removed to avoid performance issues
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
    <div className="w-full space-y-6">
      {/* Search Form */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="border-b border-gray-100 bg-white">
          <CardTitle className="text-xl font-semibold text-gray-900">
            Search Fuel Prices
          </CardTitle>
          <CardDescription className="text-gray-600">
            Search by postcode, city, town, or address to find stations with the best prices
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 bg-white">
          <form onSubmit={handleSearch}>
            <FieldGroup>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field>
                  <FieldLabel htmlFor="search">
                    <MapPinIcon className="inline w-4 h-4 mr-1" />
                    Location
                  </FieldLabel>
                  <Input
                    id="search"
                    placeholder="Postcode, city, or address (e.g. WF9 2WF, Leeds)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    required
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="fuel-type">
                    <FuelIcon className="inline w-4 h-4 mr-1" />
                    Fuel Type
                  </FieldLabel>
                  <Select
                    items={fuelTypes}
                    value={fuelType}
                    onValueChange={(value) => setFuelType(value as FuelType)}
                  >
                    <SelectTrigger id="fuel-type">
                      <SelectValue placeholder="Select fuel type" />
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
                </Field>

                <Field>
                  <FieldLabel htmlFor="radius">Search Radius</FieldLabel>
                  <Select
                    items={radiusOptions}
                    value={radius.toString()}
                    onValueChange={(value) => setRadius(parseInt(value))}
                  >
                    <SelectTrigger id="radius">
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
                </Field>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 shadow-sm"
                >
                  <SearchIcon className="inline w-4 h-4 mr-2" />
                  {isLoading ? 'Searching...' : 'Search'}
                </Button>
                
                {isSupported && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleUseMyLocation}
                    disabled={geoLoading || isLoading}
                    className="flex-1 md:flex-none py-3 px-6"
                  >
                    <Navigation className="inline w-4 h-4 mr-2" />
                    {geoLoading ? 'Getting location...' : 'Use My Location'}
                  </Button>
                )}
              </div>

              {/* Remember Location Toggle */}
              <div className="flex items-center gap-2 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.rememberLocation}
                    onChange={(e) => updatePreference('rememberLocation', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 flex items-center gap-1">
                    <BookmarkIcon className="w-4 h-4" />
                    Remember my location
                  </span>
                </label>
                {preferences.rememberLocation && preferences.lastLocation && (
                  <Badge variant="outline" className="text-xs">
                    Saved: {preferences.lastLocation.address}
                  </Badge>
                )}
              </div>
              
              {geoError && (
                <div className="text-sm text-orange-600 bg-orange-50 p-3 rounded-lg border border-orange-200">
                  {geoError}
                </div>
              )}
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card className="border border-gray-200">
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-blue-600"></div>
              <p className="text-sm text-gray-600">Searching for stations...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Results */}
      {noResults && (
        <Card className="border border-yellow-300 bg-yellow-50">
          <CardContent className="py-8">
            <div className="flex items-start gap-3">
              <AlertCircleIcon className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900 mb-1">
                  No stations found
                </p>
                <p className="text-sm text-gray-600">
                  We couldn't find any stations for "{activeSearch}". Try a different location, city, or postcode.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {hasResults && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-white border border-gray-200 rounded-lg">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {filteredStations.length} station{filteredStations.length !== 1 ? 's' : ''} found
              </h2>
              <p className="text-sm text-gray-600">
                Within {radius} miles of {locationMatches?.[0]?.postcode || activeSearch}
              </p>
            </div>
            
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="outline" className="text-sm">
                Sorted by distance
              </Badge>
              
              {/* Hide No Prices Toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideNoPrices}
                  onChange={(e) => setHideNoPrices(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  Hide stations without prices
                </span>
              </label>
              
              {/* View Toggle */}
              <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    viewMode === 'list'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <ListIcon className="inline w-4 h-4 mr-1" />
                  List
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    viewMode === 'map'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <MapIcon className="inline w-4 h-4 mr-1" />
                  Map
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
            <div className="space-y-4">
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
        <Card className="border border-gray-200 bg-white">
          <CardContent className="py-12">
            <div className="max-w-2xl mx-auto text-center space-y-6">
              <div className="text-5xl mb-4">⛽</div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Ready to Search
                </h3>
                <p className="text-gray-600">
                  6,700+ UK petrol stations - search by postcode, city, or address
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
                <div className="p-4">
                  <div className="text-2xl mb-2">⛽</div>
                  <div className="text-sm font-medium text-gray-900">6 Fuel Types</div>
                  <div className="text-xs text-gray-600">E5, E10, Diesel & more</div>
                </div>
                <div className="p-4">
                  <div className="text-2xl mb-2">📊</div>
                  <div className="text-sm font-medium text-gray-900">Price History</div>
                  <div className="text-xs text-gray-600">30-day trend charts</div>
                </div>
                <div className="p-4">
                  <div className="text-2xl mb-2">📍</div>
                  <div className="text-sm font-medium text-gray-900">Distance Filter</div>
                  <div className="text-xs text-gray-600">2-25 mile radius</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Station Card with expandable price history
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

  const formatPrice = (price: number) => {
    return `£${(price / 100).toFixed(2)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    });
  };

  const hasPrices = prices && prices.length > 0;
  
  // Hide this station if it has no prices and hideIfNoPrices is true
  if (hideIfNoPrices && !hasPrices) {
    return null;
  }
  
  // Find the selected fuel type price for highlighting
  const highlightedPrice = hasPrices ? prices.find(p => p.fuelType === selectedFuelType) : null;
  const sortedPrices = hasPrices ? [...prices].sort((a, b) => {
    if (a.fuelType === selectedFuelType) return -1;
    if (b.fuelType === selectedFuelType) return 1;
    return 0;
  }) : [];

  return (
    <Card className="overflow-hidden border border-gray-200 hover:shadow-md transition-shadow">
      <CardHeader className="bg-white">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-3">
              {index < 3 && (
                <div className="shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-semibold text-gray-700">
                  {index + 1}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  {station.brand && (
                    <BrandLogo brand={station.brand} size="sm" />
                  )}
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    {station.name}
                  </CardTitle>
                </div>
                <CardDescription className="text-sm text-gray-600">
                  {station.addressLine1}
                  {station.city && `, ${station.city}`} • {station.postcode}
                </CardDescription>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {station.distance.toFixed(1)} miles
                  </Badge>
                  {highlightedPrice && (
                    <Badge className="bg-blue-600 text-white text-xs">
                      {selectedFuelType}: {formatPrice(highlightedPrice.price)}
                    </Badge>
                  )}
                  {!hasPrices && (
                    <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                      No prices available
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      
      {hasPrices && (
        <CardContent className="space-y-4 bg-gray-50">
          {/* Current Prices Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {sortedPrices.map((price) => (
              <div
                key={price.fuelType}
                className={`rounded-lg border p-3 transition-all ${
                  price.fuelType === selectedFuelType
                    ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-600'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-xs font-medium text-gray-600 mb-1">
                  {price.fuelType}
                </div>
                <div className="text-xl font-bold text-gray-900">
                  {formatPrice(price.price)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatDate(price.recordedAt)}
                </div>
              </div>
            ))}
          </div>

          {/* Expand for Price History */}
          <Button
            variant="outline"
            onClick={() => setExpanded(!expanded)}
            className="w-full text-sm bg-white hover:bg-gray-50"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-4 h-4 mr-2" />
                Hide Price History
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-2" />
                View 30-Day Price History ({selectedFuelType})
              </>
            )}
          </Button>

          {/* Price History Chart */}
          {expanded && (
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <h4 className="text-sm font-semibold mb-4 text-gray-900">
                {selectedFuelType} Price History (Last 30 Days)
              </h4>
              {priceHistory && priceHistory.length > 0 ? (
                <PriceHistoryChart data={priceHistory} fuelType={selectedFuelType} />
              ) : (
                <div className="text-center py-8 text-gray-500">
                  {priceHistory === undefined ? 'Loading history...' : 'No price history available'}
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
      
      {!hasPrices && (
        <CardContent className="bg-gray-50">
          <div className="text-center py-8 text-gray-500">
            <AlertCircleIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="font-medium">No price data available</p>
            <p className="text-sm text-gray-400 mt-1">
              This station may be closed or price data hasn't been synced yet
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// Price History Chart Component
function PriceHistoryChart({ data, fuelType }: { data: any[], fuelType: string }) {
  const chartData = data
    .map((item) => ({
      date: new Date(item.recordedAt).toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'short' 
      }),
      price: item.price / 100, // Convert pence to pounds
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
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-center">
          <div className="text-xs text-gray-600 mb-1">Lowest</div>
          <div className="text-base font-semibold text-gray-900">£{minPrice.toFixed(2)}</div>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-center">
          <div className="text-xs text-gray-600 mb-1">Average</div>
          <div className="text-base font-semibold text-gray-900">£{avgPrice.toFixed(2)}</div>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-center">
          <div className="text-xs text-gray-600 mb-1">Highest</div>
          <div className="text-base font-semibold text-gray-900">£{maxPrice.toFixed(2)}</div>
        </div>
      </div>

      {/* Trend Indicator */}
      {priceChange !== 0 && (
        <div className={`flex items-center justify-center gap-2 p-2 rounded-lg text-sm ${
          priceChange > 0 ? 'bg-red-50 text-red-700 border border-red-200' : 
          'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {priceChange > 0 ? (
            <><TrendingUp className="w-4 h-4" /> Up £{Math.abs(priceChange).toFixed(2)} in 30 days</>
          ) : (
            <><TrendingDown className="w-4 h-4" /> Down £{Math.abs(priceChange).toFixed(2)} in 30 days</>
          )}
        </div>
      )}

      {/* Chart */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 11, fill: '#6b7280' }}
              stroke="#d1d5db"
            />
            <YAxis 
              domain={[minPrice - 0.02, maxPrice + 0.02]}
              tick={{ fontSize: 11, fill: '#6b7280' }}
              stroke="#d1d5db"
              tickFormatter={(value) => `£${value.toFixed(2)}`}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '12px'
              }}
              formatter={(value: any) => [`£${value.toFixed(2)}`, fuelType]}
            />
            <Line 
              type="monotone" 
              dataKey="price" 
              stroke="#2563eb" 
              strokeWidth={2}
              dot={{ fill: '#2563eb', r: 3 }}
              activeDot={{ r: 5 }}
              name="Price"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
