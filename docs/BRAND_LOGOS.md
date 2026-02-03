# Brand Logo System

The Fuel Price Finder includes a comprehensive brand logo and styling system for displaying fuel station brands.

## Features

✅ **Logo Images** - Shows actual brand logos for major chains (Tesco, Shell, BP, etc.)  
✅ **Brand Colors** - Styled badges with official brand colors for all brands  
✅ **Automatic Fallback** - If logo image fails to load, falls back to colored badge  
✅ **Unknown Brands** - Graceful handling of brands not in the database  
✅ **Responsive Sizing** - Three sizes (sm, md, lg) for different use cases

## Supported Brands

### With Logos
- Tesco
- Asda
- Sainsbury's
- Morrisons
- BP
- Shell
- Esso
- Texaco
- Costco

### With Brand Colors
- Gulf
- Jet
- Murco
- Total
- Rontec
- Applegreen
- And more...

## Usage

### Basic Logo

```tsx
import { BrandLogo } from '@/lib/brand-logos';

<BrandLogo brand="TESCO" size="md" />
```

### Logo Sizes

```tsx
<BrandLogo brand="BP" size="sm" />   {/* 24px height */}
<BrandLogo brand="SHELL" size="md" /> {/* 32px height */}
<BrandLogo brand="ESSO" size="lg" />  {/* 48px height */}
```

### Brand Badge (Compact)

For smaller, badge-style displays:

```tsx
import { BrandBadge } from '@/lib/brand-logos';

<BrandBadge brand="ASDA" />
```

### Get Brand Info

Get brand colors and metadata programmatically:

```tsx
import { getBrandInfo } from '@/lib/brand-logos';

const brandInfo = getBrandInfo('TESCO');
// Returns: { name: 'Tesco', logo: '...', color: '#00539F', textColor: '#FFFFFF' }
```

## Adding New Brands

To add a new brand, edit `src/lib/brand-logos.tsx`:

```typescript
export const BRANDS: Record<string, BrandInfo> = {
  // ... existing brands
  
  'YOUR_BRAND': {
    name: 'Your Brand',
    logo: 'https://example.com/logo.png', // Optional
    color: '#FF6600',
    textColor: '#FFFFFF',
  },
};
```

### Brand Logo Guidelines

1. **Logo Images:**
   - Use transparent PNG or SVG
   - Recommended: 300x100px or similar horizontal aspect ratio
   - Host on reliable CDN (or add to `/public/brands/`)

2. **Brand Colors:**
   - Use official brand color from their style guide
   - Ensure good contrast with text color
   - Test in both light and dark modes if applicable

3. **Brand Names:**
   - Use UPPERCASE keys for consistency
   - Handle variations (e.g., "SAINSBURYS" and "SAINSBURY'S")

## Implementation Details

### Automatic Brand Matching

The system automatically handles:
- **Case-insensitive matching**: "tesco", "TESCO", "Tesco" all work
- **Partial matching**: "TESCO EXTRA" will match "TESCO"
- **Whitespace normalization**: Extra spaces are trimmed

### Error Handling

```tsx
<BrandLogo brand="UNKNOWN_BRAND" />
```

This will render a neutral gray badge with the brand name, ensuring the UI never breaks.

### Performance

- Images lazy load automatically
- Failed image loads fall back to CSS-styled badges instantly
- No impact on initial page load

## Examples in the App

### Station Search Results

Station cards show brand logos next to station names:

```tsx
<BrandLogo brand={station.brand} size="sm" />
<h3>{station.name}</h3>
```

### Price History Page

Station selection buttons include brand logos:

```tsx
<BrandLogo brand={station.brand} size="sm" />
<span>{station.name}</span>
```

## Customization

### Custom Styling

You can add custom classes:

```tsx
<BrandLogo 
  brand="BP" 
  size="md" 
  className="opacity-80 hover:opacity-100 transition-opacity"
/>
```

### Without Logo (Force Badge)

To always use the colored badge instead of logo:

```tsx
<BrandBadge brand="SHELL" />
```

## Local Logo Files

Instead of using external URLs, you can host logos locally:

1. Add logos to `/public/brands/`:
   ```
   /public/brands/tesco.png
   /public/brands/bp.png
   ```

2. Update the BRANDS object:
   ```typescript
   TESCO: {
     name: 'Tesco',
     logo: '/brands/tesco.png',
     color: '#00539F',
     textColor: '#FFFFFF',
   },
   ```

## Future Enhancements

Potential improvements:
- [ ] Dark mode variants
- [ ] SVG logos for perfect scaling
- [ ] Brand-specific gradients
- [ ] Animation effects on hover
- [ ] Filter stations by brand
- [ ] Brand comparison charts

## Related Files

- Implementation: `src/lib/brand-logos.tsx`
- Station Cards: `src/components/convex-fuel-search.tsx`
- Price History: `src/components/price-history-example.tsx`
