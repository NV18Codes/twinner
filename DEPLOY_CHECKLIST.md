# ✅ Deployment Checklist

## Before You Start
- [ ] Code is pushed to GitHub
- [ ] You have accounts for:
  - [ ] Backend hosting (Railway/Render/Heroku)
  - [ ] Netlify (for frontend)

---

## Backend Deployment

### Step 1: Deploy Backend
- [ ] Choose hosting service (Railway recommended)
- [ ] Connect GitHub repository
- [ ] Deploy backend
- [ ] **Copy your backend API URL**: `https://________________.com`

### Step 2: Test Backend
- [ ] Visit: `https://your-api.com/health`
- [ ] Should see: `{"status":"ok"}`
- [ ] ✅ Backend is working!

---

## Frontend Configuration

### Step 3: Update API URL
- [ ] Open `config.js`
- [ ] Replace API URL with your backend URL
- [ ] Save file
- [ ] Commit and push to GitHub

---

## Frontend Deployment

### Step 4: Deploy to Netlify
- [ ] Go to https://app.netlify.com
- [ ] Import project from GitHub
- [ ] Deploy site
- [ ] **Copy your Netlify URL**: `https://________________.netlify.app`

### Step 5: Set Environment Variable
- [ ] Go to Netlify → Site settings → Environment variables
- [ ] Add: `REACT_APP_API_URL` = `https://your-backend-api.com`
- [ ] Redeploy site

### Step 6: Update Backend CORS
- [ ] Open `server.js`
- [ ] Add Netlify URL to `allowedOrigins` array
- [ ] Push to GitHub (backend auto-redeploys)

---

## Final Testing

- [ ] Visit Netlify URL
- [ ] Open browser console (F12)
- [ ] Check: `🔧 API Base URL configured: https://your-api.com`
- [ ] Test sign up
- [ ] Test sign in
- [ ] Test upload
- [ ] Test map display

---

## 🎉 Done!

**Your URLs:**
- Frontend: `https://________________.netlify.app`
- Backend: `https://________________.com`

---

## Quick Commands

```bash
# Update config.js with your API URL
# Then push:
git add .
git commit -m "Configure API URL"
git push origin main
```

