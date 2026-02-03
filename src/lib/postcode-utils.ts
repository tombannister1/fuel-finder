/**
 * UK Postcode utilities
 * Handles normalization and validation of UK postcodes
 */

/**
 * Normalizes a UK postcode to standard format (e.g., "WF9 2WF")
 * 
 * UK postcode format:
 * - Outward code (2-4 characters): area + district
 * - Space
 * - Inward code (3 characters): sector + unit
 * 
 * @example
 * normalizePostcode("wf92wf") // "WF9 2WF"
 * normalizePostcode("SW1A1AA") // "SW1A 1AA"
 * normalizePostcode("WF9 2WF") // "WF9 2WF" (already normalized)
 */
export function normalizePostcode(postcode: string): string {
  if (!postcode) return '';
  
  // Remove all whitespace and convert to uppercase
  const cleaned = postcode.replace(/\s+/g, '').toUpperCase();
  
  // UK postcodes are 5-7 characters (without space)
  if (cleaned.length < 5 || cleaned.length > 7) {
    return postcode.trim().toUpperCase(); // Return as-is if invalid length
  }
  
  // The inward code is always the last 3 characters
  const inward = cleaned.slice(-3);
  const outward = cleaned.slice(0, -3);
  
  return `${outward} ${inward}`;
}

/**
 * Extracts the outward code (area + district) from a postcode
 * 
 * @example
 * getOutwardCode("WF9 2WF") // "WF9"
 * getOutwardCode("WF92WF") // "WF9"
 * getOutwardCode("SW1A 1AA") // "SW1A"
 */
export function getOutwardCode(postcode: string): string {
  const normalized = normalizePostcode(postcode);
  return normalized.split(' ')[0] || '';
}

/**
 * Validates if a string looks like a UK postcode
 * Basic validation - checks format but not if postcode actually exists
 */
export function isValidPostcodeFormat(postcode: string): boolean {
  if (!postcode) return false;
  
  // UK postcode regex (basic validation)
  // Format: AA9A 9AA, A9A 9AA, A9 9AA, A99 9AA, AA9 9AA, AA99 9AA
  const postcodeRegex = /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i;
  
  return postcodeRegex.test(postcode.trim());
}
