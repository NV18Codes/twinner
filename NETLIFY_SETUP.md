# Quick Netlify Setup Guide

## 🚀 Fast Deployment Steps

### 1. Prepare Your Code

1. **Update `config.js`** with your backend API URL:
   ```javascript
   const API_BASE_URL = 'https://your-backend-api.com';
   ```

2. **Commit and push to GitHub**:
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

### 2. Deploy to Netlify (5 minutes)

#### Option A: Via Website (Easiest)

1. Go to https://app.netlify.com
2. Click **"Add new site"** → **"Import an existing project"**
3. Click **"Deploy with GitHub"**
4. Authorize Netlify (if first time)
5. Select your repository: `twinner`
6. Click **"Deploy site"**
7. Wait 1-2 minutes for deployment
8. **Done!** Your site is live at `https://random-name.netlify.app`

#### Option B: Via CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
cd twinner
netlify deploy --prod
```

### 3. Set Environment Variable (Important!)

1. In Netlify dashboard, go to your site
2. Click **"Site settings"** → **"Environment variables"**
3. Click **"Add variable"**
4. Add:
   - **Key**: `REACT_APP_API_URL`
   - **Value**: `https://your-backend-api.com`
5. Click **"Save"**
6. Go to **"Deploys"** tab → Click **"Trigger deploy"** → **"Clear cache and deploy site"**

### 4. Update Backend CORS

In your `server.js`, update CORS to allow your Netlify domain:

```javascript
app.use(cors({
    origin: [
        'http://localhost:3000',
        'https://your-site-name.netlify.app',
        'https://your-custom-domain.com'
    ],
    credentials: true
}));
```

### 5. Test

1. Visit your Netlify URL
2. Open browser console (F12)
3. Try signing up/login
4. Upload an image
5. Check if pins appear on map

---

## 📝 Important Notes

- **API URL**: Make sure your backend API is deployed and accessible
- **CORS**: Backend must allow requests from Netlify domain
- **Environment Variables**: Must redeploy after changing them
- **Custom Domain**: Can be added later in Netlify settings

---

## 🔧 Troubleshooting

**CORS Error?**
→ Update backend CORS to include Netlify domain

**API not working?**
→ Check `config.js` has correct API URL
→ Check browser console for errors

**Build failed?**
→ No build needed! Set build command to empty

---

## ✅ You're Done!

Your site should now be live and working! 🎉

