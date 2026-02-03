import * as React from 'react';
import { X } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { BrandLogo } from '@/lib/brand-logos';

interface Station {
  _id: string;
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
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 9999 }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* Modal */}
      <Card 
        className="relative z-10 w-full max-w-md max-h-[80vh] flex flex-col bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 text-white rounded-t-lg bg-[linear-gradient(to_right,#9333ea,#2563eb)]">
          <div>
            <h3 className="text-lg font-bold">Nearby Stations</h3>
            <p className="text-sm opacity-90">{stations.length} stations in this area</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable station list */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-3">
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
      </Card>
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
  
  const formatPrice = (price: number) => {
    return `£${(price / 100).toFixed(2)}`;
  };

  const hasPrices = prices && prices.length > 0;
  const selectedPrice = hasPrices ? prices.find(p => p.fuelType === selectedFuelType) : null;

  return (
    <Card
      className="p-3 hover:shadow-md transition-shadow cursor-pointer border border-gray-200 hover:border-blue-300"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Rank badge */}
        <div className="shrink-0">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
            {index + 1}
          </div>
        </div>

        {/* Station info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {station.brand && (
              <BrandLogo brand={station.brand} size="xs" />
            )}
            <h4 className="font-semibold text-gray-900 text-sm truncate">
              {station.name}
            </h4>
          </div>
          
          <p className="text-xs text-gray-600 mb-2">
            {station.addressLine1}
            {station.city && `, ${station.city}`}
            <br />
            {station.postcode}
          </p>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {station.distance.toFixed(1)} miles
            </Badge>
            
            {/* Price badge */}
            {selectedPrice ? (
              <Badge className="bg-green-600 text-white text-xs">
                {selectedFuelType}: {formatPrice(selectedPrice.price)}
              </Badge>
            ) : hasPrices ? (
              <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                No {selectedFuelType}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-gray-500">
                No prices
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
