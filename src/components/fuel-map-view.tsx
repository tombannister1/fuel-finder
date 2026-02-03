// @ts-nocheck
import * as React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { BrandLogo } from '@/lib/brand-logos';
import { createBrandMarkerIcon, createUserLocationIcon, createClusterMarkerIcon } from '@/lib/map-markers';
import { ClusterModal } from './cluster-modal';

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

// Component to update map view when center changes
function MapUpdater({ center, zoom }: { center: LatLngExpression; zoom: number }) {
  const map = useMap();
  
  React.useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);

  return null;
}

export function FuelMapView({
  stations,
  centerPoint,
  userLocation,
  radius,
  selectedFuelType,
  onStationClick,
}: FuelMapViewProps) {
  const [selectedStation, setSelectedStation] = React.useState<string | null>(null);
  const [clusterModalOpen, setClusterModalOpen] = React.useState(false);
  const [clusterStations, setClusterStations] = React.useState<Station[]>([]);

  // Calculate zoom level based on radius
  const getZoomLevel = (radiusMiles: number) => {
    if (radiusMiles <= 2) return 13;
    if (radiusMiles <= 5) return 11;
    if (radiusMiles <= 10) return 10;
    if (radiusMiles <= 15) return 9;
    return 8;
  };

  const formatPrice = (price: number) => {
    return `£${(price / 100).toFixed(2)}`;
  };

  const mapCenter: LatLngExpression = userLocation 
    ? [userLocation.lat, userLocation.lng]
    : [centerPoint.lat, centerPoint.lng];

  const zoom = getZoomLevel(radius);

  return (
    <Card className="overflow-hidden border border-gray-200">
      <div style={{ height: '450px', width: '100%' }}>
        <MapContainer
          center={mapCenter}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
          zoomControl={true}
        >
          <MapUpdater center={mapCenter} zoom={zoom} />
          
          {/* OpenStreetMap tiles */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Search radius circle */}
          <Circle
            center={[centerPoint.lat, centerPoint.lng]}
            radius={radius * 1609.34} // Convert miles to meters
            pathOptions={{
              color: '#3b82f6',
              fillColor: '#3b82f6',
              fillOpacity: 0.1,
              weight: 2,
            }}
          />

          {/* User location marker */}
          {userLocation && (
            <Marker
              position={[userLocation.lat, userLocation.lng]}
              icon={createUserLocationIcon()}
            >
              <Popup>
                <div className="p-2">
                  <p className="font-semibold text-blue-600">Your Location</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {userLocation.lat.toFixed(5)}, {userLocation.lng.toFixed(5)}
                  </p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Station markers with clustering */}
          <MarkerClusterGroup
            chunkedLoading
            showCoverageOnHover={false}
            maxClusterRadius={60}
            spiderfyOnMaxZoom={false}
            iconCreateFunction={(cluster) => {
              const markers = cluster.getAllChildMarkers();
              return createClusterMarkerIcon(markers.length);
            }}
            // When a cluster is clicked, show the modal
            onClick={(e: any) => {
              const cluster = e.layer;
              if (cluster.getAllChildMarkers) {
                const markers = cluster.getAllChildMarkers();
                // Extract station data from markers
                const stationsInCluster = markers
                  .map((marker: any) => {
                    const stationId = marker.options.stationId;
                    return stations.find(s => s._id === stationId);
                  })
                  .filter(Boolean) as Station[];
                
                if (stationsInCluster.length > 1) {
                  setClusterStations(stationsInCluster);
                  setClusterModalOpen(true);
                  // Prevent default cluster behavior (zooming in)
                  if (e.originalEvent) {
                    e.originalEvent.stopPropagation();
                  }
                }
              }
            }}
          >
            {stations.map((station, index) => (
              <Marker
                key={station._id}
                position={[station.latitude, station.longitude]}
                icon={createBrandMarkerIcon(station.brand, index, selectedStation === station._id)}
                // @ts-ignore - Custom property to track station
                stationId={station._id}
                eventHandlers={{
                  click: () => {
                    setSelectedStation(station._id);
                    if (onStationClick) {
                      onStationClick(station._id);
                    }
                  },
                }}
              >
                <Popup>
                  <div className="p-2 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-2">
                      {station.brand && (
                        <BrandLogo brand={station.brand} size="xs" />
                      )}
                      <p className="font-semibold text-gray-900">{station.name}</p>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">
                      {station.addressLine1}
                      {station.city && `, ${station.city}`}
                      <br />
                      {station.postcode}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        #{index + 1}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {station.distance.toFixed(1)} miles
                      </Badge>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        </MapContainer>
      </div>

      {/* Cluster Modal */}
      <ClusterModal
        stations={clusterStations}
        isOpen={clusterModalOpen}
        onClose={() => setClusterModalOpen(false)}
        onStationClick={onStationClick}
      />
    </Card>
  );
}
