import * as React from 'react';
import { Badge } from './ui/badge';
import { FilterIcon, XIcon, ChevronDownIcon, ChevronUpIcon, SlidersHorizontal } from 'lucide-react';
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

  const formatPrice = (price: number) => `£${(price / 100).toFixed(2)}`;
  const visibleBrands = showAllBrands ? availableBrands : availableBrands.slice(0, 8);

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
            <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
          </div>
          <span className="font-medium text-foreground">Filters</span>
          {hasActiveFilters && (
            <Badge className="bg-primary/20 text-primary border-0 text-xs">
              {filterCount} / {totalCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onReset();
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  e.preventDefault();
                  onReset();
                }
              }}
              className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-primary/10 transition-colors cursor-pointer"
            >
              <XIcon className="w-3 h-3" />
              Clear
            </div>
          )}
          {isExpanded ? (
            <ChevronUpIcon className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDownIcon className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 pt-0 space-y-5 border-t border-border/50">
          {/* Brand Filter */}
          {availableBrands.length > 0 && (
            <div className="pt-4">
              <label className="text-sm font-medium text-foreground mb-3 block">
                Brands
                {filters.brands.length > 0 && (
                  <span className="text-primary ml-2 text-xs">({filters.brands.length} selected)</span>
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
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isSelected
                          ? 'ring-2 ring-offset-2 ring-offset-background'
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
                  className="mt-2 text-xs text-primary hover:text-primary/80 font-medium"
                >
                  {showAllBrands ? 'Show less' : `Show ${availableBrands.length - 8} more`}
                </button>
              )}
            </div>
          )}

          {/* Price Range Filter */}
          {priceRange.max > 0 && (
            <div>
              <label className="text-sm font-medium text-foreground mb-3 block">
                Max Price
                {filters.maxPrice && (
                  <span className="text-primary ml-2 text-xs">
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
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatPrice(priceRange.min)}</span>
                  <span>{formatPrice(priceRange.max)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Distance Filter */}
          <div>
            <label className="text-sm font-medium text-foreground mb-3 block">
              Max Distance
              {filters.maxDistance && (
                <span className="text-primary ml-2 text-xs">
                  (within {filters.maxDistance} mi)
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
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0.5 mi</span>
                <span>25 mi</span>
              </div>
            </div>
          </div>

          {/* Data Quality Filters */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground block">
              Data Quality
            </label>
            
            <label className="flex items-start gap-3 cursor-pointer group p-3 bg-secondary/30 rounded-xl hover:bg-secondary/50 transition-colors">
              <input
                type="checkbox"
                checked={filters.hideIncompleteData ?? true}
                onChange={(e) => onUpdateFilter('hideIncompleteData', e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded"
              />
              <div className="flex-1">
                <span className="text-sm text-foreground">
                  Hide incomplete stations
                </span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Filter out stations with missing or unknown data
                </p>
              </div>
            </label>
          </div>

          {/* Results Summary */}
          <div className="pt-3 border-t border-border/50">
            <div className="text-sm text-muted-foreground">
              {hasActiveFilters ? (
                <>
                  Showing <span className="font-semibold text-foreground">{filterCount}</span> of{' '}
                  <span className="font-semibold text-foreground">{totalCount}</span> stations
                </>
              ) : (
                <>
                  Showing all <span className="font-semibold text-foreground">{totalCount}</span> stations
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
