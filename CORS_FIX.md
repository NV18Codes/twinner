# CORS Fix for Netlify Deployment

## Problem
```
Access to fetch at 'https://twinner.onrender.com/api/auth/login' from origin 'https://twinnir.netlify.app' 
has been blocked by CORS policy: Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Solution Applied

1. **Added explicit CORS middleware** that handles OPTIONS (preflight) requests
2. **Set headers before other middleware** to ensure preflight requests are handled
3. **Allow all origins** for now (can restrict later for security)

## Changes Made

- Custom CORS middleware that:
  - Handles OPTIONS requests explicitly
  - Sets all required CORS headers
  - Allows credentials
  - Logs preflight requests for debugging

- Backup `cors` package middleware with `origin: true` to allow all origins

## Next Steps

1. **Push to GitHub**:
   ```bash
   git add server.js
   git commit -m "Fix CORS for Netlify - handle preflight requests"
   git push origin main
   ```

2. **Wait for Render to redeploy** (2-3 minutes)

3. **Test the login** at https://twinnir.netlify.app/

4. **Check backend logs** in Render dashboard to see:
   - `✅ CORS preflight request handled for origin: https://twinnir.netlify.app`
   - `🔐 Login attempt received`

## Security Note

Currently allowing all origins for easier deployment. Once confirmed working, you can restrict to:
```javascript
const allowedOrigins = [
    'https://twinnir.netlify.app',
    'http://localhost:3000',
    // ... other allowed origins
];
```

Then change `origin: true` to use the allowedOrigins array.

