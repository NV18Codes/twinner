# Quick Deploy to Netlify - Updated Changes

## Option 1: Manual Deploy via Netlify Dashboard (Fastest)

1. **Go to Netlify Dashboard**: https://app.netlify.com/
2. **Select your site**: `twinnir.netlify.app`
3. **Go to "Deploys" tab**
4. **Drag and drop** your entire project folder OR click **"Deploy manually"**
5. **Wait for deployment** (usually 1-2 minutes)

## Option 2: Connect Git Repository (Recommended for future)

### If you have a GitHub/GitLab/Bitbucket repository:

1. **Push your code to GitHub**:
   ```bash
   # Create a new repository on GitHub first, then:
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git branch -M main
   git push -u origin main
   ```

2. **In Netlify Dashboard**:
   - Go to your site settings
   - Click "Site configuration" → "Build & deploy"
   - Click "Link to Git provider"
   - Connect your GitHub account
   - Select your repository
   - Netlify will auto-deploy on every push!

## Option 3: Netlify CLI (Alternative)

If you have Netlify CLI installed:

```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

## What Changed?

✅ **TWINNER → TWINNIR** everywhere:
- Page titles
- Logo alt text
- Copyright text
- API messages
- User-Agent strings

✅ **Single unified dropdown** in upload form:
- Replaced 6 separate dropdowns with 1 unified dropdown
- Organized with optgroups (Organizations, Spaces, Space Types, Assets, Asset Types, Properties)

## Verify Deployment

After deploying, check:
1. https://twinnir.netlify.app/ - Should show "TWINNIR" not "TWINNER"
2. Go to map page and click "Upload Media" - Should see single dropdown
3. Check browser console for any errors

## Troubleshooting

If changes don't appear:
1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Hard refresh** (Ctrl+F5 or Cmd+Shift+R)
3. **Check Netlify deploy logs** for errors
4. **Wait 2-3 minutes** for CDN cache to clear

