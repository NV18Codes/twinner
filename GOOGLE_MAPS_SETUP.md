# Google Maps Setup Guide

## Why Google Maps?

✅ **Street View** - Real 360° street-level imagery  
✅ **Better 3D Buildings** - More accurate and detailed  
✅ **Clearer Views** - Superior rendering and clarity  
✅ **Familiar Interface** - Everyone knows Google Maps  
✅ **Real-time Updates** - Always up-to-date imagery  

## Setup Steps

### 1. Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable these APIs:
   - **Maps JavaScript API**
   - **Street View Static API** (optional, for Street View)
   - **Geocoding API** (for reverse geocoding)
4. Go to "Credentials" → "Create Credentials" → "API Key"
5. Copy your API key

### 2. Update the API Key

Open `map.html` and replace `YOUR_GOOGLE_MAPS_API_KEY` with your actual key:

```html
<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_ACTUAL_API_KEY&libraries=places,geometry"></script>
```

### 3. Set API Key Restrictions (Recommended)

In Google Cloud Console:
- Go to "Credentials" → Click your API key
- Under "API restrictions", select "Restrict key"
- Choose: "Maps JavaScript API", "Street View Static API", "Geocoding API"
- Under "Application restrictions", add your domain (for production)

### 4. Pricing

**Free Tier (Monthly):**
- Maps JavaScript API: $200 free credit
- Street View Static API: $200 free credit
- Geocoding API: $200 free credit

**After Free Tier:**
- Maps JavaScript API: $7 per 1,000 loads
- Street View: $7 per 1,000 requests
- Geocoding: $5 per 1,000 requests

For most projects, the free tier is sufficient!

## Features Available

- ✅ 3D Buildings (automatic)
- ✅ Street View integration
- ✅ Satellite view
- ✅ Terrain view
- ✅ Hybrid view
- ✅ Real-time traffic (optional)
- ✅ Better clarity and rendering

## Switch Back to Mapbox

If you want to switch back to Mapbox:
1. Change `map-app-google.js` to `map-app.js` in `map.html`
2. Restore Mapbox script tags

