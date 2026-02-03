import * as React from 'react';
import { useFuelFinder } from '@/hooks/use-fuel-finder';
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
import { SearchIcon, MapPinIcon, FuelIcon, AlertCircleIcon } from 'lucide-react';
import type { FuelType } from '@/types/fuel-finder';
import { normalizePostcode } from '@/lib/postcode-utils';

const fuelTypes: { label: string; value: FuelType }[] = [
  { label: 'All Fuel Types', value: 'E10' as FuelType }, // Default to E10 for "all"
  { label: 'E5 (Super Unleaded)', value: 'E5' },
  { label: 'E10 (Regular Unleaded)', value: 'E10' },
  { label: 'Diesel', value: 'Diesel' },
  { label: 'Super Diesel', value: 'Super Diesel' },
  { label: 'B10 (Biodiesel)', value: 'B10' },
  { label: 'HVO (Renewable Diesel)', value: 'HVO' },
];

const radiusOptions = [
  { label: '2 miles', value: '2' },
  { label: '5 miles', value: '5' },
  { label: '10 miles', value: '10' },
  { label: '15 miles', value: '15' },
  { label: '25 miles', value: '25' },
];

export function FuelFinderSearch() {
  const [postcode, setPostcode] = React.useState('');
  const [fuelType, setFuelType] = React.useState<FuelType | null>(null);
  const [radius, setRadius] = React.useState<string>('5');

  const {
    stations,
    isLoading,
    error,
    total,
    searchByPostcode,
    isConfigured,
  } = useFuelFinder();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postcode.trim()) return;

    // Normalize postcode to standard format with proper spacing
    const normalized = normalizePostcode(postcode);
    
    await searchByPostcode(normalized, {
      fuelType: fuelType || undefined,
      radius: parseInt(radius),
      sortBy: 'price',
      limit: 50,
    });
  };

  const formatPrice = (price: number) => {
    return `£${(price / 100).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Unknown';
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle>Find Cheapest Fuel Prices</CardTitle>
          <CardDescription>
            Search for petrol stations near you with real-time fuel prices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch}>
            <FieldGroup>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field>
                  <FieldLabel htmlFor="postcode">
                    <MapPinIcon className="inline w-4 h-4 mr-1" />
                    Postcode
                  </FieldLabel>
                  <Input
                    id="postcode"
                    placeholder="e.g. SW1A 1AA"
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value)}
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
                    value={radius}
                    onValueChange={setRadius}
                  >
                    <SelectTrigger id="radius">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {radiusOptions.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full md:w-auto"
              >
                <SearchIcon className="inline w-4 h-4 mr-2" />
                {isLoading ? 'Searching...' : 'Search Fuel Prices'}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Card className="border-red-500 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircleIcon className="w-5 h-5" />
              <p className="font-medium">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {stations.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">
              Found {total} stations
            </h2>
            <Badge variant="outline">
              Sorted by price
            </Badge>
          </div>

          <div className="grid gap-4">
            {stations.map((station) => (
              <Card key={station.id}>
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
                        {station.address.line1}
                        {station.address.city && `, ${station.address.city}`}
                        {' • '}
                        {station.address.postcode}
                        {station.distance && (
                          <span className="ml-2">
                            ({station.distance.toFixed(1)} miles)
                          </span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {station.fuelPrices.map((price) => (
                      <div
                        key={price.fuelType}
                        className="rounded-lg border p-3 bg-muted/50"
                      >
                        <div className="text-sm font-medium text-muted-foreground">
                          {price.fuelType}
                        </div>
                        <div className="text-2xl font-bold">
                          {formatPrice(price.price)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(price.lastUpdated)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Setup Instructions */}
      {!isConfigured && stations.length === 0 && !isLoading && !error && (
        <Card>
          <CardHeader>
            <CardTitle>API Setup Required</CardTitle>
            <CardDescription>
              Configure your API credentials to access fuel price data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="prose prose-sm">
              <ol className="space-y-2">
                <li>
                  Register at{' '}
                  <a
                    href="https://www.developer.fuel-finder.service.gov.uk/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    developer.fuel-finder.service.gov.uk
                  </a>
                </li>
                <li>Obtain your OAuth 2.0 credentials (Client ID and Client Secret)</li>
                <li>
                  Create a <code>.env</code> file with:
                  <pre className="mt-2 p-3 bg-muted rounded-md text-xs">
                    VITE_FUEL_FINDER_CLIENT_ID=your_client_id_here{'\n'}
                    VITE_FUEL_FINDER_CLIENT_SECRET=your_client_secret_here
                  </pre>
                </li>
                <li>Restart the development server</li>
              </ol>
              <p className="mt-4 text-sm text-muted-foreground">
                With API access, you'll get real-time data from all UK petrol stations
                updated within 30 minutes of any price change.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
