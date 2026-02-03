import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });

const CLIENT_ID = process.env.VITE_FUEL_FINDER_CLIENT_ID;
const CLIENT_SECRET = process.env.VITE_FUEL_FINDER_CLIENT_SECRET;
const API_URL = process.env.VITE_FUEL_FINDER_API_URL || "https://www.fuel-finder.service.gov.uk/api/v1";
const TOKEN_URL = process.env.VITE_FUEL_FINDER_TOKEN_URL || "https://www.fuel-finder.service.gov.uk/api/v1/oauth/generate_access_token";

console.log("\n" + "=".repeat(80));
console.log("🔑 FUEL FINDER API - CURL COMMANDS FOR POSTMAN");
console.log("=".repeat(80) + "\n");

console.log("📋 STEP 1: Get OAuth Token");
console.log("-".repeat(80));
console.log("\nCopy this curl command into Postman (or terminal):\n");

console.log(`curl -X POST '${TOKEN_URL}' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "client_id": "${CLIENT_ID}",
    "client_secret": "${CLIENT_SECRET}",
    "grant_type": "client_credentials"
  }'`);

console.log("\n\n📋 STEP 2: Use the token to fetch stations");
console.log("-".repeat(80));
console.log("\nReplace YOUR_ACCESS_TOKEN with the token from step 1:\n");

console.log(`# Fetch batch 1 (first 500 stations)
curl -X GET '${API_URL}/pfs?batch-number=1' \\
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -H 'Accept: application/json'`);

console.log("\n\n# Fetch batch 2 (next 500 stations)");
console.log(`curl -X GET '${API_URL}/pfs?batch-number=2' \\
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -H 'Accept: application/json'`);

console.log("\n\n📋 ALTERNATIVE: Fetch fuel prices");
console.log("-".repeat(80));
console.log("\nIf /pfs doesn't work, try this endpoint:\n");

console.log(`curl -X GET '${API_URL}/pfs/fuel-prices?batch-number=1' \\
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -H 'Accept: application/json'`);

console.log("\n\n📋 POSTMAN SETUP");
console.log("-".repeat(80));
console.log(`
1. Create new request in Postman
2. Set method to POST
3. URL: ${TOKEN_URL}
4. Headers tab:
   - Content-Type: application/json
5. Body tab (select "raw" and "JSON"):
   {
     "client_id": "${CLIENT_ID}",
     "client_secret": "${CLIENT_SECRET}",
     "grant_type": "client_credentials"
   }
6. Click Send
7. Copy the access_token from the response
8. Create new GET request
9. URL: ${API_URL}/pfs?batch-number=1
10. Headers tab:
    - Authorization: Bearer YOUR_ACCESS_TOKEN
    - Content-Type: application/json
    - Accept: application/json
11. Click Send
`);

console.log("=".repeat(80) + "\n");
