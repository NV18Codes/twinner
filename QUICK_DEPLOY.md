# 🚀 Quick Deployment Guide - TWINNER

## Step 1: Deploy Backend API (Choose One)

### Option A: Railway (Recommended - Easiest)
1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your `twinner` repository
5. Railway auto-detects Node.js
6. **Copy your API URL** (e.g., `https://twinner-production.up.railway.app`)

### Option B: Render
1. Go to https://render.com
2. Sign up/login
3. "New" → "Web Service"
4. Connect GitHub repo
5. Settings:
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
6. Deploy → **Copy API URL**

### Option C: Heroku
```bash
heroku create your-app-name
git push heroku main
# Copy: https://your-app-name.herokuapp.com
```

---

## Step 2: Update API Configuration

1. **Open `config.js`**
2. **Replace the API URL**:
   ```javascript
   const API_BASE_URL = 'https://your-backend-api.com';
   ```
   (Use the URL from Step 1)

3. **Save the file**

---

## Step 3: Update Backend CORS

1. **Open `server.js`**
2. **Find the CORS section** (around line 13-15)
3. **Add your Netlify domain** to `allowedOrigins` array:
   ```javascript
   const allowedOrigins = [
       'http://localhost:3000',
       'https://your-site-name.netlify.app',  // Add this
   ];
   ```
   (You'll know your Netlify URL after Step 4)

---

## Step 4: Deploy Frontend to Netlify

### Via Website (5 minutes):

1. **Push code to GitHub**:
   ```bash
   git add .
   git commit -m "Ready for Netlify deployment"
   git push origin main
   ```

2. **Go to Netlify**:
   - Visit https://app.netlify.com
   - Sign up/login (use GitHub)

3. **Deploy**:
   - Click "Add new site" → "Import an existing project"
   - Choose "Deploy with GitHub"
   - Select your `twinner` repository
   - Click "Deploy site"
   - Wait 1-2 minutes

4. **Copy your Netlify URL** (e.g., `https://twinner-123.netlify.app`)

5. **Set Environment Variable**:
   - Go to Site settings → Environment variables
   - Add:
     - **Key**: `REACT_APP_API_URL`
     - **Value**: Your backend API URL from Step 1
   - Save

6. **Redeploy**:
   - Go to Deploys tab
   - Click "Trigger deploy" → "Clear cache and deploy site"

---

## Step 5: Update Backend CORS (Again)

1. **Go back to `server.js`**
2. **Add your Netlify URL** to `allowedOrigins`:
   ```javascript
   const allowedOrigins = [
       'http://localhost:3000',
       'https://twinner-123.netlify.app',  // Your actual Netlify URL
   ];
   ```

3. **Redeploy backend** (push to GitHub if using Railway/Render)

---

## Step 6: Test Everything

1. **Visit your Netlify URL**
2. **Open browser console** (F12)
3. **Check console** - should see: `API Base URL configured: https://your-api.com`
4. **Test**:
   - Sign up → Should work
   - Sign in → Should work
   - Upload image → Should work
   - View map → Pins should appear

---

## ✅ Done!

Your app is now live! 🎉

**Frontend**: `https://your-site.netlify.app`  
**Backend**: `https://your-api.com`

---

## 🔧 Troubleshooting

**CORS Error?**
→ Add Netlify URL to backend CORS `allowedOrigins`

**API not working?**
→ Check `config.js` has correct API URL
→ Check browser console for errors
→ Verify backend is running

**Environment variable not working?**
→ Must redeploy after setting it
→ Check variable name is `REACT_APP_API_URL`

---

## 📝 Files Created

- ✅ `config.js` - API configuration
- ✅ `netlify.toml` - Netlify configuration
- ✅ `DEPLOYMENT.md` - Detailed guide
- ✅ `NETLIFY_SETUP.md` - Quick setup
- ✅ `QUICK_DEPLOY.md` - This file

All API calls now use `getApiUrl()` function automatically!

