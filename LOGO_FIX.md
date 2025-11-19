# Logo Fix for Netlify

## Problem
The logo wasn't showing on Netlify because:
1. The logo was in `public/.well-known/appspecific/Logo.png`
2. Netlify was publishing from root (`publish = "."`)
3. The catch-all redirect `/*` was redirecting all requests (including images) to `index.html`

## Solution Applied

1. **Copied logo to root**: `.well-known/appspecific/Logo.png` is now in the root directory
2. **Created `_redirects` file**: Added rules to serve static files directly before the catch-all redirect
3. **Updated `netlify.toml`**: Simplified redirect rules (handled by `_redirects` file)

## Files Changed

- ✅ Copied `.well-known/` folder from `public/` to root
- ✅ Created `_redirects` file in root (Netlify automatically uses this)
- ✅ Updated `netlify.toml` to keep `publish = "."`

## Next Steps

1. **Commit and push**:
   ```bash
   git add .well-known _redirects netlify.toml
   git commit -m "Fix logo path for Netlify deployment"
   git push origin master
   ```

2. **Redeploy on Netlify**:
   - Go to Netlify dashboard
   - Trigger a new deploy (or wait for auto-deploy from Git)
   - The logo should now appear at `/.well-known/appspecific/Logo.png`

## Testing

After redeploy, check:
- Logo appears in header: `https://twinnir.netlify.app/`
- Logo appears on map page: `https://twinnir.netlify.app/map.html`
- Direct logo URL works: `https://twinnir.netlify.app/.well-known/appspecific/Logo.png`

