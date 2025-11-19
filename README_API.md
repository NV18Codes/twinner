# TWINNER API Documentation

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

The server will run on `http://localhost:3000`

## Database

SQLite database file: `twinner.db` (created automatically)

## API Endpoints

### Authentication

#### Register
- **POST** `/api/auth/register`
- Body: `{ "email": "user@example.com", "password": "password123" }`

#### Login
- **POST** `/api/auth/login`
- Body: `{ "email": "user@example.com", "password": "password123" }`
- Returns: `{ "token": "...", "user": {...} }`

#### Logout
- **POST** `/api/auth/logout`
- Headers: `Authorization: Bearer <token>`

### Media

#### Upload Media
- **POST** `/api/media/upload`
- Headers: `Authorization: Bearer <token>`
- Form Data:
  - `media` (file): Image or video file
  - `category` (string): solar, unused, building, equipment, other
  - `description` (string, optional)
  - `latitude` (number, optional): Required if no EXIF GPS
  - `longitude` (number, optional): Required if no EXIF GPS

#### Get All Media
- **GET** `/api/media?category=all`
- Query params:
  - `category` (optional): Filter by category

#### Get Media by Location
- **GET** `/api/media/location?lat=-26.2041&lng=28.0473&category=all`
- Query params:
  - `lat` (required): Latitude
  - `lng` (required): Longitude
  - `category` (optional): Filter by category

#### Delete Media
- **DELETE** `/api/media/:id`
- Headers: `Authorization: Bearer <token>`

### Locations

#### Get Grouped Locations
- **GET** `/api/locations?category=all`
- Query params:
  - `category` (optional): Filter by category

### Export

#### Export User Data
- **GET** `/api/export`
- Headers: `Authorization: Bearer <token>`
- Returns all media for the authenticated user

## Postman Collection

Import `TWINNER_API.postman_collection.json` into Postman.

### Environment Variables
- `base_url`: `http://localhost:3000`
- `auth_token`: Auto-set after login

## Categories

- `solar`: Solar Panels (Orange)
- `unused`: Unused Assets (Brown)
- `building`: Buildings (Blue)
- `equipment`: Equipment (Purple)
- `other`: Other (Blue Grey)

