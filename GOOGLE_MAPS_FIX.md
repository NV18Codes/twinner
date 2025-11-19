# Fix Google Maps "Can't Load" Error

## Quick Fix Steps

### 1. Enable Required APIs
Go to [Google Cloud Console](https://console.cloud.google.com/):
- Navigate to "APIs & Services" → "Library"
- Enable these APIs:
  ✅ **Maps JavaScript API** (REQUIRED)
  ✅ **Geocoding API** (for address lookup)
  ✅ **Places API** (optional, for better features)

### 2. Fix API Key Restrictions

**Option A: For Development (Localhost)**
1. Go to "APIs & Services" → "Credentials"
2. Click on your API key
3. Under "Application restrictions":
   - Select "None" (for testing)
   - OR select "HTTP referrers" and add:
     - `http://localhost:*`
     - `http://127.0.0.1:*`
     - `file://*` (if opening HTML directly)

**Option B: For Production**
- Add your domain: `https://yourdomain.com/*`

### 3. Check Billing
- Google Maps requires billing to be enabled (even for free tier)
- Go to "Billing" → Link a payment method
- You still get $200 free credit per month

### 4. Verify API Key
Make sure your API key in `map.html` matches the one in Google Cloud Console.

## Common Issues

❌ **"This page can't load Google Maps correctly"**
→ Usually means API key restrictions or APIs not enabled

❌ **"RefererNotAllowedMapError"**
→ Add your domain to HTTP referrers list

❌ **"ApiNotActivatedMapError"**
→ Enable Maps JavaScript API

## Test Your Setup

1. Open `map.html` in browser
2. Check browser console (F12) for specific error
3. Verify API key is correct in Google Cloud Console

