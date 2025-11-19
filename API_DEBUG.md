# API Debugging Guide

## Make sure the server is running!

1. **Start the server:**
   ```bash
   npm start
   ```

2. **You should see:**
   ```
   🚀 TWINNER API Server running on http://localhost:3000
   📊 Health check: http://localhost:3000/health
   Connected to SQLite database
   Database tables initialized
   ```

## Check Console Logs

### Browser Console (F12)
- Look for: "Fetching media from API"
- Look for: "Uploading to API..."
- Look for: "Upload response status"
- Look for: "Media data received"

### Server Console (Terminal)
- Look for: "Registration attempt for:"
- Look for: "Login attempt for:"
- Look for: "GET /api/media"
- Look for: "Inserting media into database"
- Look for: "Media inserted successfully"

## Common Issues

1. **Server not running:**
   - Run `npm start` in terminal
   - Check if port 3000 is available

2. **Database not initialized:**
   - Check if `twinner.db` file exists
   - Check server console for "Database tables initialized"

3. **API calls failing:**
   - Check browser console for errors
   - Check server console for errors
   - Verify server is running on http://localhost:3000

4. **Data not saving:**
   - Check server console for "Media inserted successfully"
   - Check if database file exists: `twinner.db`
   - Verify user_id is being set correctly

## Test the API

1. **Health check:**
   - Open: http://localhost:3000/health
   - Should return: `{"status":"ok","message":"TWINNER API is running"}`

2. **Check database:**
   - The database file is: `twinner.db` in the project root
   - You can use SQLite browser to view it

