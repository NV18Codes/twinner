# Clear Netlify Cache - Fix mapboxgl Error

## The Problem
You're seeing `mapboxgl is not defined` error even though we're using Leaflet. This is because Netlify is serving a **cached version** of the old file.

## Solution Steps

### Option 1: Clear Netlify Cache (Recommended)
1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Select your site (`twinnir`)
3. Go to **Site Settings** → **Build & Deploy** → **Build settings**
4. Scroll down to **Clear cache and retry deploy**
5. Click **Clear cache and retry deploy**
6. Wait for deployment to complete (2-3 minutes)

### Option 2: Trigger New Deployment
1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Select your site
3. Go to **Deploys** tab
4. Click **Trigger deploy** → **Clear cache and deploy site**

### Option 3: Hard Refresh Browser
After Netlify deploys:
1. Open your site: `https://twinnir.netlify.app/map.html`
2. Press `Ctrl + Shift + R` (Windows/Linux) or `Cmd + Shift + R` (Mac)
3. Or open DevTools (F12) → Right-click refresh button → **Empty Cache and Hard Reload**

## Verification
After clearing cache, check the browser console:
- ✅ Should see: `🔧 API Base URL configured: https://twinner.onrender.com`
- ✅ Should see: `✅ Supabase client initialized`
- ❌ Should NOT see: `mapboxgl is not defined`

## What We Changed
1. Added cache-busting query parameter: `map-app.js?v=2.0.0&nocache=leaflet-only`
2. Added no-cache meta tags in HTML
3. Updated Netlify cache headers to prevent long-term caching
4. Added clear version comments in `map-app.js`

The file is **100% clean** - no Mapbox references exist. The error is purely from caching.

