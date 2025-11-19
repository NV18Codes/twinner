# ✅ Deployment Configuration Complete!

## Your Backend API URL
**https://twinner.onrender.com**

This has been configured in `config.js`. The frontend will now use this API URL.

---

## Next Steps: Deploy Frontend to Netlify

### Step 1: Push Code to GitHub
```bash
git add .
git commit -m "Configure API URL for production"
git push origin main
```

### Step 2: Deploy to Netlify

1. **Go to**: https://app.netlify.com
2. **Sign up/login** (use GitHub)
3. **Click**: "Add new site" → "Import an existing project"
4. **Choose**: "Deploy with GitHub"
5. **Select**: Your `twinner` repository
6. **Configure**:
   - Build command: **Leave EMPTY**
   - Publish directory: `/` (root)
7. **Click**: "Deploy site"
8. **Wait**: 1-2 minutes
9. **Copy your Netlify URL**: `https://________________.netlify.app`

### Step 3: Set Environment Variable

1. In Netlify dashboard → **Site settings** → **Environment variables**
2. **Add variable**:
   - **Key**: `REACT_APP_API_URL`
   - **Value**: `https://twinner.onrender.com`
3. **Save**
4. **Redeploy**: Deploys tab → "Trigger deploy" → "Clear cache and deploy site"

### Step 4: Update Backend CORS

1. **Open `server.js`**
2. **Find** `allowedOrigins` array (around line 14)
3. **Add your Netlify URL**:
   ```javascript
   const allowedOrigins = [
       'http://localhost:3000',
       'http://localhost:8080',
       'http://127.0.0.1:5500',
       'https://your-site-name.netlify.app',  // Add this
   ];
   ```
4. **Save and push**:
   ```bash
   git add server.js
   git commit -m "Update CORS for Netlify"
   git push origin main
   ```
5. **Render will auto-redeploy** (takes 2-3 minutes)

---

## Test Your Deployment

1. **Visit your Netlify URL**
2. **Open browser console** (F12)
3. **Check**: Should see `🔧 API Base URL configured: https://twinner.onrender.com`
4. **Test**:
   - Sign up → Should work
   - Sign in → Should work
   - Upload image → Should save
   - View map → Pins should appear

---

## Current Configuration

- ✅ **Backend API**: `https://twinner.onrender.com`
- ✅ **Frontend**: Will be at `https://your-site.netlify.app` (after deployment)
- ✅ **All API calls**: Configured to use `getApiUrl()` function
- ✅ **CORS**: Ready to add Netlify domain

---

## Quick Commands

```bash
# After deploying to Netlify, update CORS:
# 1. Add Netlify URL to server.js allowedOrigins
# 2. Push to GitHub:
git add server.js
git commit -m "Add Netlify to CORS"
git push origin main
```

---

## 🎉 You're Almost Done!

Just deploy to Netlify and update CORS with your Netlify URL!

