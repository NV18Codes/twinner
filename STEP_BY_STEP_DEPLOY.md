# 📋 Step-by-Step Deployment Guide

## 🎯 Overview
This guide will help you:
1. Configure your backend API URL
2. Deploy backend to a hosting service
3. Deploy frontend to Netlify

---

## 📝 STEP 1: Configure API URL

### 1.1 Open `config.js`
- File location: `twinner/config.js`

### 1.2 Update the API URL
Replace `'http://localhost:3000'` with your backend API URL:

```javascript
const API_BASE_URL = 'https://your-backend-api.com';
```

**For now, leave it as `localhost:3000` - we'll update it after deploying the backend.**

---

## 🚀 STEP 2: Deploy Backend API

### Option A: Railway (Easiest - Recommended)

1. **Go to**: https://railway.app
2. **Sign up** with GitHub
3. **Click**: "New Project" → "Deploy from GitHub repo"
4. **Select**: Your `twinner` repository
5. **Wait**: Railway auto-detects Node.js and deploys (2-3 minutes)
6. **Copy your API URL**: 
   - Click on your project
   - Go to "Settings" → "Domains"
   - Copy the URL (e.g., `https://twinner-production.up.railway.app`)
7. **Update CORS** (we'll do this in Step 4)

### Option B: Render

1. **Go to**: https://render.com
2. **Sign up/login**
3. **Click**: "New" → "Web Service"
4. **Connect**: Your GitHub repository
5. **Configure**:
   - **Name**: `twinner-api` (or any name)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
6. **Click**: "Create Web Service"
7. **Wait**: 5-10 minutes for deployment
8. **Copy your API URL**: `https://twinner-api.onrender.com`

### Option C: Heroku

1. **Install Heroku CLI**: https://devcenter.heroku.com/articles/heroku-cli
2. **Login**:
   ```bash
   heroku login
   ```
3. **Create app**:
   ```bash
   cd twinner
   heroku create twinner-api
   ```
4. **Deploy**:
   ```bash
   git push heroku main
   ```
5. **Copy your API URL**: `https://twinner-api.herokuapp.com`

---

## ✅ STEP 3: Test Backend API

1. **Open browser**: Visit `https://your-api-url.com/health`
2. **Should see**: `{"status":"ok","message":"TWINNER API is running"}`
3. **If error**: Check deployment logs in your hosting service

---

## 🔧 STEP 4: Update Frontend API Configuration

1. **Open `config.js`**
2. **Replace** with your backend API URL:
   ```javascript
   const API_BASE_URL = 'https://your-backend-api.com';
   ```
   (Use the URL from Step 2)

3. **Save the file**

---

## 🌐 STEP 5: Deploy Frontend to Netlify

### 5.1 Push Code to GitHub

```bash
git add .
git commit -m "Configure API URL for deployment"
git push origin main
```

### 5.2 Deploy via Netlify Website

1. **Go to**: https://app.netlify.com
2. **Sign up/login** (use GitHub for easy connection)
3. **Click**: "Add new site" → "Import an existing project"
4. **Choose**: "Deploy with GitHub"
5. **Authorize**: Netlify to access your GitHub (if first time)
6. **Select**: Your `twinner` repository
7. **Configure**:
   - **Build command**: Leave **EMPTY** (no build needed)
   - **Publish directory**: `/` (root)
8. **Click**: "Deploy site"
9. **Wait**: 1-2 minutes for deployment
10. **Copy your Netlify URL**: 
    - You'll see: `https://random-name-123.netlify.app`
    - Or click "Site settings" → "Change site name" to set custom name

### 5.3 Set Environment Variable (Important!)

1. **In Netlify dashboard**:
   - Go to your site
   - Click "Site settings" (gear icon)
   - Click "Environment variables" (left sidebar)
2. **Add variable**:
   - Click "Add variable"
   - **Key**: `REACT_APP_API_URL`
   - **Value**: Your backend API URL (from Step 2)
   - Click "Save"
3. **Redeploy**:
   - Go to "Deploys" tab
   - Click "Trigger deploy" → "Clear cache and deploy site"

---

## 🔒 STEP 6: Update Backend CORS

1. **Open `server.js`**
2. **Find** the `allowedOrigins` array (around line 14)
3. **Add your Netlify URL**:
   ```javascript
   const allowedOrigins = [
       'http://localhost:3000',
       'http://localhost:8080',
       'http://127.0.0.1:5500',
       'https://your-site-name.netlify.app',  // Add this line
   ];
   ```
4. **Save and push to GitHub**:
   ```bash
   git add server.js
   git commit -m "Update CORS for Netlify"
   git push origin main
   ```
5. **Backend will auto-redeploy** (Railway/Render auto-deploys on push)

---

## 🧪 STEP 7: Test Everything

1. **Visit your Netlify URL**
2. **Open browser console** (F12)
3. **Check console** - should see:
   ```
   🔧 API Base URL configured: https://your-backend-api.com
   ```
4. **Test features**:
   - ✅ Sign up → Create account
   - ✅ Sign in → Login
   - ✅ Upload image → Should save
   - ✅ View map → Pins should appear
   - ✅ Search by category → Should filter pins

---

## 📋 Quick Checklist

- [ ] Backend deployed and accessible
- [ ] Backend health check works (`/health` endpoint)
- [ ] `config.js` updated with backend API URL
- [ ] Code pushed to GitHub
- [ ] Netlify site created
- [ ] Environment variable `REACT_APP_API_URL` set in Netlify
- [ ] Netlify site redeployed
- [ ] Backend CORS updated with Netlify URL
- [ ] Backend redeployed
- [ ] Tested sign up/login
- [ ] Tested media upload
- [ ] Tested map display

---

## 🆘 Troubleshooting

### Problem: CORS Error
**Solution**: 
1. Add Netlify URL to `allowedOrigins` in `server.js`
2. Redeploy backend

### Problem: API calls going to wrong URL
**Solution**:
1. Check `config.js` has correct API URL
2. Check browser console for actual API calls
3. Clear browser cache (Ctrl+Shift+R)

### Problem: Environment variable not working
**Solution**:
1. Must redeploy after setting environment variable
2. Check variable name is exactly `REACT_APP_API_URL`
3. Check Netlify deployment logs

### Problem: Backend not accessible
**Solution**:
1. Check backend deployment logs
2. Verify backend is running
3. Test `/health` endpoint directly

---

## 🎉 You're Done!

Your TWINNER app is now live on:
- **Frontend**: `https://your-site.netlify.app`
- **Backend**: `https://your-api.com`

---

## 📞 Need Help?

Check the detailed guides:
- `DEPLOYMENT.md` - Full deployment guide
- `NETLIFY_SETUP.md` - Netlify-specific setup
- `QUICK_DEPLOY.md` - Quick reference

