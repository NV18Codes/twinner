# Map Setup Instructions

## Issue: Black Screen on Map

If you see a black screen, it's likely because the Mapbox access token is invalid or expired.

## Quick Fix:

1. **Get a Free Mapbox Token:**
   - Go to https://account.mapbox.com/
   - Sign up for a free account
   - Navigate to "Access tokens"
   - Copy your default public token

2. **Update the Token:**
   - Open `map-app.js`
   - Find line 8: `mapboxgl.accessToken = 'pk.eyJ1...';`
   - Replace with your token

3. **Alternative: Use OpenStreetMap (No Token Required)**
   - We can switch to Leaflet.js with OpenStreetMap tiles
   - This doesn't require any API key

## Current Status:

The map should work once you add a valid Mapbox token. The placeholder token in the code may not work.

## Testing:

1. Open browser console (F12)
2. Check for any error messages
3. Look for "Map loaded successfully" message

