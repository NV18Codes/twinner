# Backend Setup Guide

## Quick Start

1. **Install dependencies:**
```bash
npm install
```

2. **Start the server:**
```bash
npm start
```

Server runs on `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login (returns token)
- `POST /api/auth/logout` - Logout

### Media
- `POST /api/media/upload` - Upload image/video (requires auth)
- `GET /api/media` - Get all media (optional category filter)
- `GET /api/media/location` - Get media by location
- `DELETE /api/media/:id` - Delete media (requires auth)

### Locations
- `GET /api/locations` - Get grouped locations

### Export
- `GET /api/export` - Export user data (requires auth)

## Postman Collection

1. Open Postman
2. Click "Import"
3. Select `TWINNER_API.postman_collection.json`
4. Set environment variable:
   - `base_url`: `http://localhost:3000`

## Testing with Postman

1. **Register a user:**
   - Use "Register" endpoint
   - Body: `{ "email": "test@example.com", "password": "test123" }`

2. **Login:**
   - Use "Login" endpoint
   - Token is automatically saved to `auth_token` variable

3. **Upload media:**
   - Use "Upload Media" endpoint
   - Select a file in form-data
   - Add category, description
   - If image has EXIF GPS, latitude/longitude are optional

4. **Get media:**
   - Use "Get All Media" endpoint
   - Optional: Add `?category=solar` query param

## Database

SQLite database file: `twinner.db` (created automatically)

Tables:
- `users` - User accounts
- `sessions` - Authentication sessions
- `media` - Uploaded media files
- `locations` - Grouped location data

