import { X, Fuel } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Badge } from './ui/badge';
import { BrandLogo } from '@/lib/brand-logos';

interface Station {
  _id: Id<'stations'>;
  name: string;
  brand?: string;
  latitude: number;
  longitude: number;
  postcode: string;
  addressLine1: string;
  city?: string;
  distance: number;
}

interface ClusterModalProps {
  stations: Station[];
  isOpen: boolean;
  onClose: () => void;
  onStationClick?: (stationId: string) => void;
  selectedFuelType?: string;
}

export function ClusterModal({ stations, isOpen, onClose, onStationClick, selectedFuelType = 'E10' }: ClusterModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ zIndex: 9999 }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Modal */}
      <div 
        className="relative z-10 w-full sm:max-w-md max-h-[85vh] flex flex-col bg-card border border-border rounded-t-3xl sm:rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar for mobile */}
        <div className="sm:hidden w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto mt-3" />
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Fuel className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">{stations.length} Stations</h3>
              <p className="text-sm text-muted-foreground">Showing {selectedFuelType} prices</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Scrollable station list */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-2">
            {stations
              .sort((a, b) => a.distance - b.distance)
              .map((station, index) => (
                <StationListItem
                  key={station._id}
                  station={station}
                  index={index}
                  selectedFuelType={selectedFuelType}
                  onClick={() => {
                    if (onStationClick) {
                      onStationClick(station._id);
                    }
                    onClose();
                  }}
                />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Separate component to handle price fetching for each station
function StationListItem({ 
  station, 
  index, 
  selectedFuelType,
  onClick 
}: { 
  station: Station; 
  index: number;
  selectedFuelType: string;
  onClick: () => void;
}) {
  const prices = useQuery(api.fuelPrices.getCurrentPrices, { stationId: station._id });
  
  const formatPrice = (price: number) => (price / 100).toFixed(1);

  const hasPrices = prices && prices.length > 0;
  const selectedPrice = hasPrices ? prices.find(p => p.fuelType === selectedFuelType) : null;

  return (
    <button
      className="w-full p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-all text-left"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        {/* Rank badge */}
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
          index === 0 ? 'bg-yellow-500/20 text-yellow-500' :
          index === 1 ? 'bg-zinc-400/20 text-zinc-400' :
          index === 2 ? 'bg-amber-600/20 text-amber-600' :
          'bg-muted text-muted-foreground'
        }`}>
          {index + 1}
        </div>

        {/* Station info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            {station.brand && (
              <BrandLogo brand={station.brand} size="sm" />
            )}
            <h4 className="font-medium text-foreground text-sm truncate">
              {station.name}
            </h4>
          </div>
          
          <p className="text-xs text-muted-foreground truncate">
            {station.addressLine1}{station.city && `, ${station.city}`}
          </p>
          
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-[10px] bg-secondary/50">
              {station.distance.toFixed(1)} mi
            </Badge>
          </div>
        </div>

        {/* Price display - prominent on the right */}
        <div className="text-right shrink-0">
          {selectedPrice ? (
            <>
              <div className="text-lg font-bold text-primary">
                {formatPrice(selectedPrice.price)}p
              </div>
              <div className="text-[10px] text-muted-foreground">
                {selectedFuelType}
              </div>
            </>
          ) : hasPrices ? (
            <div className="text-xs text-muted-foreground">
              No {selectedFuelType}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">
              --
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
