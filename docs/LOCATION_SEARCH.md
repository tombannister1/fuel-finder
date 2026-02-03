# Unified Location Search Feature

## Overview

Enhanced search functionality that allows users to find fuel stations by **postcode, city, town, address, or even station name** - all in one unified search box.

## Features

### 1. **Flexible Search Input**
Users can now search using:
- **Postcodes**: "WF9 2WF", "SW1A 1AA", or "M1 1AA"
- **Cities/Towns**: "Leeds", "Manchester", "London"
- **Partial addresses**: "Oxford Street", "High Street"
- **Station names**: "Shell", "BP", "Tesco"

### 2. **Case-Insensitive Search**
All searches are automatically converted to uppercase for consistent matching, so users can type naturally.

### 3. **Multiple Search Endpoints**

#### `searchByPostcode` (Optimized)
- Uses indexed postcode field
- Normalizes postcodes with proper spacing
- Matches exact postcodes and outward codes
- Fast and efficient for postcode-specific searches

#### `searchByCity` (Optimized)
- Uses indexed city field
- Case-insensitive matching
- Supports partial city name matches
- Fast for city-specific searches

#### `searchByLocation` (Unified)
- Searches across multiple fields: city, postcode, address, and station name
- Great for flexible user input
- Returns matches from any field

## Implementation Details

### Backend Changes

**Schema Update** (`convex/schema.ts`):
```typescript
.index("by_city", ["city"])
```
Added a new index on the city field for efficient city-based queries.

**New Query Functions** (`convex/stations.ts`):

1. **`searchByCity`**: Dedicated city search with index optimization
2. **`searchByLocation`**: Unified search across all location-related fields

### Frontend Changes

**Component Update** (`src/components/convex-fuel-search.tsx`):
- Changed from single "Postcode" field to flexible "Location" search box
- Updated placeholder to show multiple search options
- Now uses unified `searchByLocation` query for maximum flexibility

**New Hooks** (`src/hooks/use-convex-fuel-finder.ts`):
- `useStationsByCity`: Hook for city-specific searches
- `useStationsByLocation`: Hook for unified location searches

## Usage Examples

### Frontend Component
```tsx
// The search component now accepts any location query
<Input
  placeholder="Postcode, city, or address (e.g. WF9 2WF, Leeds)"
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
/>
```

### Direct Convex Queries
```typescript
// Search by city
const stations = useQuery(api.stations.searchByCity, { city: "Leeds" });

// Unified search (recommended for user input)
const stations = useQuery(api.stations.searchByLocation, { query: "Leeds" });

// Still works: Search by postcode
const stations = useQuery(api.stations.searchByPostcode, { postcode: "WF9 2WF" });
```

## User Experience Improvements

### Before
- ❌ Users had to know exact postcode
- ❌ Couldn't search by city or town
- ❌ Limited to postcode-only searches

### After
- ✅ Search by anything: postcode, city, address, or station name
- ✅ Flexible input - type naturally
- ✅ Case-insensitive matching
- ✅ Partial matches supported
- ✅ Single unified search box

## Search Examples

| User Input | What It Finds |
|------------|---------------|
| "Leeds" | All stations in Leeds |
| "WF9" | All stations in WF9 postcode area |
| "WF9 2WF" | Stations near that specific postcode |
| "Shell" | All Shell-branded stations |
| "Oxford Street" | Stations on Oxford Street (any city) |
| "Tesco" | All Tesco fuel stations |
| "london" | All stations in London (case-insensitive) |

## Performance Considerations

### Indexed Searches (Fastest)
- `searchByPostcode` - uses `by_postcode` index
- `searchByCity` - uses `by_city` index

### Filtered Searches (Still Fast)
- `searchByLocation` - scans up to 500 stations with in-memory filtering
- Suitable for typical datasets (hundreds to low thousands of stations)

### Scalability Notes
For very large datasets (10,000+ stations), consider:
- Implementing pagination
- Using a dedicated search service (e.g., Algolia, Elasticsearch)
- Adding more specific indexes

## Future Enhancements

Potential improvements:
- **Autocomplete**: Suggest cities/postcodes as user types
- **Geolocation**: "Use my location" button
- **Fuzzy matching**: Handle typos gracefully
- **Search history**: Remember recent searches
- **Popular locations**: Quick buttons for major cities
- **County search**: Search by county/region

## Files Modified

- ✅ `convex/schema.ts` - Added city index
- ✅ `convex/stations.ts` - Added searchByCity and searchByLocation queries
- ✅ `src/hooks/use-convex-fuel-finder.ts` - Added new hooks
- ✅ `src/components/convex-fuel-search.tsx` - Updated to use unified search
- ✅ `docs/LOCATION_SEARCH.md` (this file)

## Testing

To test the new search functionality:

1. Start the dev server: `pnpm dev`
2. Navigate to the search page
3. Try different search types:
   - Postcode: "WF9 2WF" or "SW1A1AA"
   - City: "Leeds", "London", "Manchester"
   - Partial: "Shell", "Tesco", "High Street"
4. Verify results are relevant and distance-sorted

## Backward Compatibility

✅ All existing functionality is preserved:
- Original `searchByPostcode` query still works
- Postcode normalization still applied
- Existing hooks remain unchanged
- New functionality is additive, not breaking
