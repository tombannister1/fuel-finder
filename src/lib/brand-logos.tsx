/**
 * Brand Logo System
 * Provides brand logos, colors, and fallbacks for fuel station brands
 */

export interface BrandInfo {
  name: string;
  logo?: string; // URL to logo image
  color: string; // Brand color for fallback
  textColor?: string; // Text color for badges
}

/**
 * Brand database with logos and colors
 * Logos are from public sources or can be replaced with actual logo files
 */
export const BRANDS: Record<string, BrandInfo> = {
  TESCO: {
    name: 'Tesco',
    logo: 'https://logos-world.net/wp-content/uploads/2020/11/Tesco-Logo.png',
    color: '#00539F',
    textColor: '#FFFFFF',
  },
  ASDA: {
    name: 'Asda',
    logo: 'https://logos-world.net/wp-content/uploads/2020/11/Asda-Logo.png',
    color: '#78BE20',
    textColor: '#FFFFFF',
  },
  SAINSBURYS: {
    name: "Sainsbury's",
    logo: 'https://logos-world.net/wp-content/uploads/2020/11/Sainsburys-Logo.png',
    color: '#EC8B00',
    textColor: '#FFFFFF',
  },
  MORRISONS: {
    name: 'Morrisons',
    logo: 'https://logos-world.net/wp-content/uploads/2020/11/Morrisons-Logo.png',
    color: '#FFD200',
    textColor: '#000000',
  },
  BP: {
    name: 'BP',
    logo: 'https://logos-world.net/wp-content/uploads/2020/04/BP-Logo.png',
    color: '#00853F',
    textColor: '#FFFFFF',
  },
  SHELL: {
    name: 'Shell',
    logo: 'https://logos-world.net/wp-content/uploads/2020/04/Shell-Logo.png',
    color: '#DD1D21',
    textColor: '#FFFFFF',
  },
  ESSO: {
    name: 'Esso',
    logo: 'https://logos-world.net/wp-content/uploads/2020/12/Esso-Logo.png',
    color: '#EE3124',
    textColor: '#FFFFFF',
  },
  TEXACO: {
    name: 'Texaco',
    logo: 'https://logos-world.net/wp-content/uploads/2020/12/Texaco-Logo.png',
    color: '#E31837',
    textColor: '#FFFFFF',
  },
  GULF: {
    name: 'Gulf',
    color: '#FF6A13',
    textColor: '#FFFFFF',
  },
  JET: {
    name: 'Jet',
    color: '#000000',
    textColor: '#FFFFFF',
  },
  'MURCO': {
    name: 'Murco',
    color: '#E20714',
    textColor: '#FFFFFF',
  },
  TOTAL: {
    name: 'Total',
    color: '#EE3124',
    textColor: '#FFFFFF',
  },
  RONTEC: {
    name: 'Rontec',
    color: '#0066B3',
    textColor: '#FFFFFF',
  },
  APPLEGREEN: {
    name: 'Applegreen',
    color: '#8DC63F',
    textColor: '#FFFFFF',
  },
  COSTCO: {
    name: 'Costco',
    logo: 'https://logos-world.net/wp-content/uploads/2020/09/Costco-Logo.png',
    color: '#0066B3',
    textColor: '#FFFFFF',
  },
  // Add more brands as needed
};

/**
 * Get brand info by name (case-insensitive, handles variations)
 */
export function getBrandInfo(brandName?: string): BrandInfo | null {
  if (!brandName) return null;

  const normalized = brandName.toUpperCase().trim();
  
  // Direct match
  if (BRANDS[normalized]) {
    return BRANDS[normalized];
  }

  // Partial matches
  for (const [key, info] of Object.entries(BRANDS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return info;
    }
  }

  return null;
}

/**
 * Brand Logo Component
 */
interface BrandLogoProps {
  brand: string;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
}

export function BrandLogo({ brand, size = 'md', showName = false, className = '' }: BrandLogoProps) {
  const brandInfo = getBrandInfo(brand);
  
  const sizeClasses = {
    sm: 'h-6 w-auto max-w-[80px]',
    md: 'h-8 w-auto max-w-[100px]',
    lg: 'h-12 w-auto max-w-[140px]',
  };

  const badgeSizeClasses = {
    sm: 'h-6 px-2 text-xs',
    md: 'h-8 px-3 text-sm',
    lg: 'h-12 px-4 text-base',
  };

  if (!brandInfo) {
    // Fallback for unknown brands
    return (
      <div className={`inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-800 ${className}`}>
        {brand}
      </div>
    );
  }

  // If we have a logo image
  if (brandInfo.logo) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <img
          src={brandInfo.logo}
          alt={brandInfo.name}
          className={`object-contain ${sizeClasses[size]}`}
          onError={(e) => {
            // Fallback to badge if image fails to load
            const target = e.currentTarget;
            target.style.display = 'none';
            if (target.nextSibling) {
              (target.nextSibling as HTMLElement).style.display = 'inline-flex';
            }
          }}
        />
        <div
          style={{
            backgroundColor: brandInfo.color,
            color: brandInfo.textColor,
          }}
          className={`hidden rounded-md items-center justify-center font-semibold ${badgeSizeClasses[size]}`}
        >
          {brandInfo.name}
        </div>
      </div>
    );
  }

  // Colored badge fallback
  return (
    <div
      style={{
        backgroundColor: brandInfo.color,
        color: brandInfo.textColor,
      }}
      className={`inline-flex items-center rounded-md font-semibold ${badgeSizeClasses[size]} ${className}`}
    >
      {brandInfo.name}
    </div>
  );
}

/**
 * Brand Badge Component (smaller, for compact displays)
 */
interface BrandBadgeProps {
  brand: string;
  className?: string;
}

export function BrandBadge({ brand, className = '' }: BrandBadgeProps) {
  const brandInfo = getBrandInfo(brand);

  if (!brandInfo) {
    return (
      <span className={`inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800 ${className}`}>
        {brand}
      </span>
    );
  }

  return (
    <span
      style={{
        backgroundColor: brandInfo.color + '20', // 20% opacity
        color: brandInfo.color,
        borderColor: brandInfo.color + '40',
      }}
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${className}`}
    >
      {brandInfo.name}
    </span>
  );
}
