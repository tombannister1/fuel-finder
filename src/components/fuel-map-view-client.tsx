import * as React from 'react';

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
    // Dynamically import the map component only on the client
    import('./fuel-map-view').then((mod) => {
      setMapComponent(() => mod.FuelMapView);
    });
  }, []);

  if (!isClient || !MapComponent) {
    return (
      <div className="h-[450px] w-full flex items-center justify-center bg-gray-100 rounded-lg border border-gray-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  return <MapComponent {...props} />;
}
