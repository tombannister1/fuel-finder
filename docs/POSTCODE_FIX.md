# Postcode Search Fix

## Problem

When users entered a UK postcode without a space (e.g., "WF92WF" instead of "WF9 2WF"), the search returned incorrect results for stations nowhere near the intended location.

## Root Cause

The search logic in `convex/stations.ts` was splitting the postcode by space to extract the outward code:

```typescript
q.gte(q.field("postcode"), args.postcode.split(" ")[0])
```

When "WF92WF" was provided (no space), `split(" ")[0]` returned the entire string "WF92WF" instead of just "WF9". This caused the database query to return postcodes alphabetically >= "WF92WF", which included areas like "WF93", "WG1", etc. - nowhere near WF9 2WF.

## Solution

### 1. Created Postcode Normalization Utility

Created `src/lib/postcode-utils.ts` with functions to:
- Normalize postcodes to standard UK format (e.g., "WF9 2WF")
- Extract the outward code correctly
- Validate postcode format

UK postcodes follow the format:
- **Outward code** (2-4 characters): area + district
- **Space**
- **Inward code** (3 characters): sector + unit

The normalization works by:
1. Removing all whitespace and converting to uppercase
2. Taking the last 3 characters as the inward code
3. Taking the remaining characters as the outward code
4. Rejoining with a space: `${outward} ${inward}`

### 2. Updated Search Components

Updated both search components to normalize postcodes before querying:
- `src/components/convex-fuel-search.tsx`
- `src/components/fuel-finder-search.tsx`

### 3. Updated Backend Query

Updated `convex/stations.ts` to:
- Normalize incoming postcodes
- Use improved range query logic for partial matching

```typescript
const normalizedPostcode = normalizePostcode(args.postcode);
const outwardCode = normalizedPostcode.split(" ")[0];

// Match exact postcode or postcodes starting with outward code
q.or(
  q.eq(q.field("postcode"), normalizedPostcode),
  q.and(
    q.gte(q.field("postcode"), outwardCode),
    q.lt(q.field("postcode"), outwardCode + "~")
  )
)
```

### 4. Updated Data Import Scripts

Updated all import scripts to normalize postcodes when storing data:
- `convex/sync.ts` - Syncing from API
- `scripts/import-csv.ts` - CSV imports
- `scripts/import-interim-data.ts` - Interim scheme imports

This ensures all postcodes in the database are stored in a consistent format.

## Examples

| Input | Normalized | Outward Code |
|-------|-----------|--------------|
| "wf92wf" | "WF9 2WF" | "WF9" |
| "SW1A1AA" | "SW1A 1AA" | "SW1A" |
| "WF9 2WF" | "WF9 2WF" | "WF9" |
| "m1 1aa" | "M1 1AA" | "M1" |

## Testing

To verify the fix works:

1. Search for "WF9 2WF" - should return stations near Wakefield
2. Search for "WF92WF" (no space) - should now return the same results as above
3. Search for "SW1A1AA" (no space) - should return stations near Westminster

## Files Modified

- ✅ `src/lib/postcode-utils.ts` (new)
- ✅ `src/components/convex-fuel-search.tsx`
- ✅ `src/components/fuel-finder-search.tsx`
- ✅ `convex/stations.ts`
- ✅ `convex/sync.ts`
- ✅ `scripts/import-csv.ts`
- ✅ `scripts/import-interim-data.ts`

## Future Improvements

Consider adding:
- Client-side postcode validation to provide immediate feedback
- Auto-formatting of postcode input fields (automatically insert space)
- Fuzzy matching for typos
- Geolocation fallback if postcode is invalid
