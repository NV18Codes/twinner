# TWINNER Deployment Guide

## Step-by-Step Deployment Process

### Prerequisites
1. A GitHub account
2. A Netlify account (free tier is fine)
3. Your backend API deployed and accessible (e.g., Heroku, Railway, Render, etc.)

---

## Part 1: Configure API URL

### Step 1: Update API Configuration

1. Open `config.js` in your project
2. Replace the API URL with your backend API URL:
   ```javascript
   const API_BASE_URL = 'https://your-backend-api.com';
   ```
   Or use environment variable (recommended for Netlify):
   ```javascript
   const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';
   ```

### Step 2: Update All API Calls (Already Done)

All API calls in `map-app.js` have been updated to use `getApiUrl()` function, which automatically prepends your API base URL.

---

## Part 2: Deploy Backend API

### Option A: Deploy to Heroku

1. **Install Heroku CLI**: Download from https://devcenter.heroku.com/articles/heroku-cli

2. **Login to Heroku**:
   ```bash
   heroku login
   ```

3. **Create Heroku App**:
   ```bash
   cd twinner
   heroku create your-app-name
   ```

4. **Set Environment Variables** (if needed):
   ```bash
   heroku config:set NODE_ENV=production
   ```

5. **Deploy**:
   ```bash
   git add .
   git commit -m "Deploy to Heroku"
   git push heroku main
   ```

6. **Your API URL will be**: `https://your-app-name.herokuapp.com`

### Option B: Deploy to Railway

1. Go to https://railway.app
2. Sign up/login with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Railway will auto-detect Node.js and deploy
6. Your API URL will be shown in the project dashboard

### Option C: Deploy to Render

1. Go to https://render.com
2. Sign up/login
3. Click "New" → "Web Service"
4. Connect your GitHub repository
5. Set:
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
6. Deploy
7. Your API URL will be: `https://your-app-name.onrender.com`

---

## Part 3: Deploy Frontend to Netlify

### Method 1: Deploy via Netlify Dashboard (Recommended)

1. **Prepare Your Repository**:
   - Push your code to GitHub (if not already)
   - Make sure `config.js` is in the repository

2. **Go to Netlify**:
   - Visit https://app.netlify.com
   - Sign up/login (you can use GitHub to sign in)

3. **Add New Site**:
   - Click "Add new site" → "Import an existing project"
   - Choose "Deploy with GitHub"
   - Authorize Netlify to access your GitHub account
   - Select your repository

4. **Configure Build Settings**:
   - **Build command**: Leave empty (no build needed for static site)
   - **Publish directory**: `/` (root directory)
   - Click "Show advanced" and add:
     - **Base directory**: `/` (or leave empty)

5. **Set Environment Variables**:
   - Go to Site settings → Environment variables
   - Add variable:
     - **Key**: `REACT_APP_API_URL` (or `VITE_API_URL` if using Vite)
     - **Value**: Your backend API URL (e.g., `https://your-api.herokuapp.com`)

6. **Update config.js for Netlify**:
   - In `config.js`, change to:
   ```javascript
   const API_BASE_URL = process.env.REACT_APP_API_URL || 
                        window.API_BASE_URL || 
                        'http://localhost:3000';
   ```

7. **Deploy**:
   - Click "Deploy site"
   - Wait for deployment to complete
   - Your site will be live at: `https://random-name-123.netlify.app`

### Method 2: Deploy via Netlify CLI

1. **Install Netlify CLI**:
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify**:
   ```bash
   netlify login
   ```

3. **Initialize Netlify**:
   ```bash
   cd twinner
   netlify init
   ```
   - Choose "Create & configure a new site"
   - Choose your team
   - Site name: (press Enter for random name or enter custom)
   - Build command: (press Enter - no build needed)
   - Directory to deploy: `./` (current directory)

4. **Set Environment Variable**:
   ```bash
   netlify env:set REACT_APP_API_URL https://your-backend-api.com
   ```

5. **Deploy**:
   ```bash
   netlify deploy --prod
   ```

---

## Part 4: Update Frontend to Use Environment Variable

Since Netlify uses environment variables, we need to update `config.js` to read from them:

1. **Update `config.js`**:
   ```javascript
   // API Configuration
   // Reads from environment variable or uses default
   const API_BASE_URL = (() => {
       // Check for Netlify environment variable
       if (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) {
           return process.env.REACT_APP_API_URL;
       }
       // Check for window variable (can be set via Netlify's _redirects or script)
       if (window.API_BASE_URL) {
           return window.API_BASE_URL;
       }
       // Default fallback
       return 'http://localhost:3000';
   })();

   // Helper function to get full API URL
   function getApiUrl(endpoint) {
       const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
       return `${API_BASE_URL}/${cleanEndpoint}`;
   }

   // Expose globally
   window.API_BASE_URL = API_BASE_URL;
   window.getApiUrl = getApiUrl;
   ```

2. **Alternative: Use Netlify's Build-time Injection**:
   Create `netlify.toml`:
   ```toml
   [build]
     command = "echo 'No build needed'"
     publish = "."

   [build.environment]
     REACT_APP_API_URL = "https://your-backend-api.com"
   ```

---

## Part 5: Configure CORS on Backend

Your backend needs to allow requests from your Netlify domain:

1. **Update `server.js`**:
   ```javascript
   const cors = require('cors');
   
   app.use(cors({
       origin: [
           'http://localhost:3000',
           'https://your-netlify-site.netlify.app',
           'https://your-custom-domain.com'
       ],
       credentials: true
   }));
   ```

2. **Or allow all origins (for development)**:
   ```javascript
   app.use(cors({
       origin: '*',
       credentials: true
   }));
   ```

---

## Part 6: Custom Domain (Optional)

1. In Netlify dashboard, go to Site settings → Domain management
2. Click "Add custom domain"
3. Enter your domain name
4. Follow DNS configuration instructions
5. Update CORS on backend to include your custom domain

---

## Part 7: Testing

1. **Test Frontend**:
   - Visit your Netlify URL
   - Open browser console (F12)
   - Check that API calls are going to your backend URL

2. **Test API**:
   - Visit `https://your-api.com/health` (should return `{"status":"ok"}`)
   - Test login/register endpoints

3. **Test Full Flow**:
   - Sign up → Should create account
   - Sign in → Should authenticate
   - Upload media → Should save to database
   - View map → Should show pins

---

## Troubleshooting

### Issue: CORS Errors
**Solution**: Update backend CORS to include your Netlify domain

### Issue: API Calls Going to Wrong URL
**Solution**: 
1. Check `config.js` has correct API URL
2. Check Netlify environment variables
3. Clear browser cache and hard refresh (Ctrl+Shift+R)

### Issue: Environment Variables Not Working
**Solution**: 
1. Netlify environment variables need to be set in dashboard
2. For client-side, use `REACT_APP_` prefix or inject via script tag
3. Redeploy after changing environment variables

### Issue: Build Fails
**Solution**: 
- No build command needed for static site
- Set build command to empty or `echo 'No build'`

---

## Quick Checklist

- [ ] Backend API deployed and accessible
- [ ] Backend CORS configured for Netlify domain
- [ ] `config.js` updated with API URL
- [ ] Code pushed to GitHub
- [ ] Netlify site created and connected to GitHub
- [ ] Environment variables set in Netlify
- [ ] Site deployed successfully
- [ ] Tested login/register
- [ ] Tested media upload
- [ ] Tested map display

---

## Support

If you encounter issues:
1. Check browser console for errors
2. Check Netlify deployment logs
3. Check backend server logs
4. Verify API URL is correct and accessible

