import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { FilterIcon, XIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import { getBrandInfo } from '@/lib/brand-logos';
import type { StationFilters } from '@/hooks/use-station-filters';

interface StationFiltersProps {
  filters: StationFilters;
  availableBrands: string[];
  priceRange: { min: number; max: number };
  onToggleBrand: (brand: string) => void;
  onUpdateFilter: <K extends keyof StationFilters>(key: K, value: StationFilters[K]) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
  filterCount: number;
  totalCount: number;
}

export function StationFiltersPanel({
  filters,
  availableBrands,
  priceRange,
  onToggleBrand,
  onUpdateFilter,
  onReset,
  hasActiveFilters,
  filterCount,
  totalCount,
}: StationFiltersProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [showAllBrands, setShowAllBrands] = React.useState(false);

  const formatPrice = (price: number) => {
    return `£${(price / 100).toFixed(2)}`;
  };

  const visibleBrands = showAllBrands ? availableBrands : availableBrands.slice(0, 8);

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader 
        className="border-b border-gray-100 bg-white cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FilterIcon className="w-5 h-5 text-gray-600" />
            <CardTitle className="text-lg font-semibold text-gray-900">
              Filter Stations
            </CardTitle>
            {hasActiveFilters && (
              <Badge className="bg-blue-600 text-white text-xs">
                {filterCount} / {totalCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onReset();
                }}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                <XIcon className="w-4 h-4" />
                Clear
              </button>
            )}
            {isExpanded ? (
              <ChevronUpIcon className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDownIcon className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-6 space-y-6 bg-white">
          {/* Brand Filter */}
          {availableBrands.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-900 mb-3 block">
                Brands
                {filters.brands.length > 0 && (
                  <span className="text-blue-600 ml-2">({filters.brands.length} selected)</span>
                )}
              </label>
              <div className="flex flex-wrap gap-2">
                {visibleBrands.map((brand) => {
                  const isSelected = filters.brands.includes(brand);
                  const brandInfo = getBrandInfo(brand);
                  
                  return (
                    <button
                      key={brand}
                      onClick={() => onToggleBrand(brand)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        isSelected
                          ? 'ring-2 ring-offset-2'
                          : 'opacity-60 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: brandInfo?.color || '#6b7280',
                        color: brandInfo?.textColor || '#ffffff',
                        ringColor: brandInfo?.color,
                      }}
                    >
                      {brand}
                    </button>
                  );
                })}
              </div>
              {availableBrands.length > 8 && (
                <button
                  onClick={() => setShowAllBrands(!showAllBrands)}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {showAllBrands ? 'Show less' : `Show ${availableBrands.length - 8} more`}
                </button>
              )}
            </div>
          )}

          {/* Price Range Filter */}
          {priceRange.max > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-900 mb-3 block">
                Max Price
                {filters.maxPrice && (
                  <span className="text-blue-600 ml-2">
                    (up to {formatPrice(filters.maxPrice)})
                  </span>
                )}
              </label>
              <div className="space-y-2">
                <input
                  type="range"
                  min={priceRange.min}
                  max={priceRange.max}
                  step={1}
                  value={filters.maxPrice || priceRange.max}
                  onChange={(e) => onUpdateFilter('maxPrice', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-600">
                  <span>{formatPrice(priceRange.min)}</span>
                  <span>{formatPrice(priceRange.max)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Distance Filter */}
          <div>
            <label className="text-sm font-medium text-gray-900 mb-3 block">
              Max Distance
              {filters.maxDistance && (
                <span className="text-blue-600 ml-2">
                  (within {filters.maxDistance} miles)
                </span>
              )}
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min={0.5}
                max={25}
                step={0.5}
                value={filters.maxDistance || 25}
                onChange={(e) => onUpdateFilter('maxDistance', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-600">
                <span>0.5 miles</span>
                <span>25 miles</span>
              </div>
            </div>
          </div>

          {/* Data Quality Filters */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-900 mb-3 block">
              Data Quality
            </label>
            
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={filters.hideIncompleteData ?? true}
                onChange={(e) => onUpdateFilter('hideIncompleteData', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
              />
              <div className="flex-1">
                <span className="text-sm text-gray-900 group-hover:text-gray-700">
                  Hide incomplete stations
                </span>
                <p className="text-xs text-gray-500">
                  Filter out stations with missing, unknown, or incomplete data
                </p>
              </div>
            </label>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                <strong>Tip:</strong> Keeping this enabled (recommended) filters out "Unknown Station" entries and stations without proper addresses.
              </p>
            </div>
          </div>

          {/* Results Summary */}
          <div className="pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              {hasActiveFilters ? (
                <>
                  Showing <span className="font-semibold text-gray-900">{filterCount}</span> of{' '}
                  <span className="font-semibold text-gray-900">{totalCount}</span> stations
                </>
              ) : (
                <>
                  Showing all <span className="font-semibold text-gray-900">{totalCount}</span>{' '}
                  stations
                </>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
