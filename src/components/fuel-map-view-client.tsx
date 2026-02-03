import * as React from 'react';
import { Loader2, MapIcon } from 'lucide-react';

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

interface FuelMapViewProps {
  stations: Station[];
  centerPoint: { lat: number; lng: number };
  userLocation?: { lat: number; lng: number } | null;
  radius: number;
  selectedFuelType?: string;
  onStationClick?: (stationId: string) => void;
}

// Client-only wrapper to avoid SSR issues with Leaflet
export function FuelMapView(props: FuelMapViewProps) {
  const [MapComponent, setMapComponent] = React.useState<React.ComponentType<FuelMapViewProps> | null>(null);
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
    import('./fuel-map-view').then((mod) => {
      setMapComponent(() => mod.FuelMapView);
    });
  }, []);

  if (!isClient || !MapComponent) {
    return (
      <div className="h-[400px] sm:h-[500px] w-full flex items-center justify-center bg-card border border-border rounded-2xl">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-border">
      <MapComponent {...props} />
    </div>
  );
}
