import { divIcon, Icon } from 'leaflet';
import { getBrandInfo } from './brand-logos';

/**
 * Create a custom marker icon with brand colors
 */
export function createBrandMarkerIcon(
  brand: string | undefined,
  index: number,
  isHighlighted: boolean = false
): Icon {
  const brandInfo = getBrandInfo(brand);
  const brandColor = brandInfo?.color || '#ef4444';
  const size = isHighlighted ? 36 : 32;
  const fontSize = isHighlighted ? '15px' : '13px';

  return divIcon({
    className: 'custom-station-marker',
    html: `
      <div style="
        position: relative !important;
        width: ${size}px !important;
        height: ${size}px !important;
        margin: 0 !important;
        padding: 0 !important;
      ">
        <!-- Shadow -->
        <div style="
          position: absolute !important;
          bottom: -8px !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          width: ${size * 0.8}px !important;
          height: 8px !important;
          background: radial-gradient(ellipse, rgba(0,0,0,0.3) 0%, transparent 70%) !important;
          border-radius: 50% !important;
        "></div>
        
        <!-- Main marker circle -->
        <div style="
          width: 100% !important;
          height: 100% !important;
          background: ${brandColor} !important;
          border: 3px solid white !important;
          border-radius: 50% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          color: white !important;
          font-weight: bold !important;
          font-size: ${fontSize} !important;
          font-family: 'Inter Variable', sans-serif !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.25) !important;
          cursor: pointer !important;
          position: relative !important;
          z-index: 1 !important;
        ">${index + 1}</div>
        
        ${isHighlighted ? `
          <!-- Highlight ring -->
          <div style="
            position: absolute !important;
            top: -4px !important;
            left: -4px !important;
            right: -4px !important;
            bottom: -4px !important;
            border: 2px solid ${brandColor} !important;
            border-radius: 50% !important;
            opacity: 0.5 !important;
          "></div>
        ` : ''}
      </div>
    `,
    iconSize: [size, size + 8],
    iconAnchor: [size / 2, size / 2 + 4],
    popupAnchor: [0, -size / 2 - 4],
  });
}

/**
 * Create user location marker icon
 */
export function createUserLocationIcon(): Icon {
  return divIcon({
    className: 'user-location-marker',
    html: `
      <style>
        @keyframes pulse-ring {
          0% { transform: translate(-50%, -50%) scale(0.8); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; }
        }
      </style>
      <div style="position: relative !important; width: 24px !important; height: 24px !important; margin: 0 !important; padding: 0 !important;">
        <!-- Pulsing ring -->
        <div style="
          position: absolute !important;
          top: 50% !important;
          left: 50% !important;
          transform: translate(-50%, -50%) !important;
          width: 24px !important;
          height: 24px !important;
          background: #3b82f6 !important;
          border-radius: 50% !important;
          opacity: 0.3 !important;
          animation: pulse-ring 2s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite !important;
        "></div>
        
        <!-- Inner dot -->
        <div style="
          position: absolute !important;
          top: 50% !important;
          left: 50% !important;
          transform: translate(-50%, -50%) !important;
          width: 16px !important;
          height: 16px !important;
          background: #3b82f6 !important;
          border: 3px solid white !important;
          border-radius: 50% !important;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.5) !important;
          z-index: 1 !important;
        "></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

/**
 * Create a cluster marker for multiple stations
 */
export function createClusterMarkerIcon(count: number): Icon {
  const size = Math.min(44 + Math.floor(count / 5) * 4, 64);
  const fontSize = size > 54 ? 18 : size > 48 ? 16 : 14;
  
  return divIcon({
    className: 'custom-cluster-icon',
    html: `
      <div style="
        width: ${size}px !important;
        height: ${size}px !important;
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%) !important;
        border: 3px solid white !important;
        border-radius: 50% !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        color: white !important;
        font-weight: 700 !important;
        font-size: ${fontSize}px !important;
        font-family: 'Inter Variable', sans-serif !important;
        box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4), 0 2px 8px rgba(0,0,0,0.2) !important;
        cursor: pointer !important;
        margin: 0 !important;
        padding: 0 !important;
      ">
        ${count}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}
