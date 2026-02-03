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
  const pulseAnimation = isHighlighted ? `
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
  ` : '';

  return divIcon({
    className: 'custom-station-marker',
    html: `
      <style>
        ${pulseAnimation}
        .marker-${index} {
          animation: ${isHighlighted ? 'pulse 2s ease-in-out infinite' : 'none'};
        }
      </style>
      <div class="marker-${index}" style="
        position: relative;
        width: ${size}px;
        height: ${size}px;
      ">
        <!-- Shadow -->
        <div style="
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: ${size * 0.8}px;
          height: 8px;
          background: radial-gradient(ellipse, rgba(0,0,0,0.3) 0%, transparent 70%);
          border-radius: 50%;
        "></div>
        
        <!-- Main marker circle -->
        <div style="
          width: 100%;
          height: 100%;
          background: ${brandColor};
          border: 3px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: ${fontSize};
          font-family: 'Inter Variable', sans-serif;
          box-shadow: 0 4px 12px rgba(0,0,0,0.25);
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          z-index: 1;
        ">${index + 1}</div>
        
        ${isHighlighted ? `
          <!-- Highlight ring -->
          <div style="
            position: absolute;
            top: -4px;
            left: -4px;
            right: -4px;
            bottom: -4px;
            border: 2px solid ${brandColor};
            border-radius: 50%;
            opacity: 0.5;
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
          0% {
            transform: scale(0.8);
            opacity: 1;
          }
          100% {
            transform: scale(2.5);
            opacity: 0;
          }
        }
      </style>
      <div style="position: relative; width: 24px; height: 24px;">
        <!-- Pulsing ring -->
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 24px;
          height: 24px;
          background: #3b82f6;
          border-radius: 50%;
          opacity: 0.3;
          animation: pulse-ring 2s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite;
        "></div>
        
        <!-- Inner dot -->
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 16px;
          height: 16px;
          background: #3b82f6;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.5);
          z-index: 1;
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
  const size = Math.min(40 + Math.floor(count / 10) * 5, 60);
  
  return divIcon({
    className: 'cluster-marker',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: 3px solid white;
        border-radius: 50%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-family: 'Inter Variable', sans-serif;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        cursor: pointer;
      ">
        <div style="font-size: ${size > 50 ? '18px' : '16px'};">${count}</div>
        <div style="font-size: 9px; opacity: 0.9;">stations</div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}
