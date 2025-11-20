# TWINNIR - Intelligent Digital Twins Platform

A modern web application for digital twin visualization and management, specifically designed for South African clients.

## Features

- **Landing Page**: Beautiful hero section with gradient design
- **3D Maps**: Interactive 3D map visualization using Mapbox GL JS
- **Mock Authentication**: Quick demo authentication system
- **South Africa Focus**: Pre-configured for South African locations
- **Responsive Design**: Works on desktop and mobile devices

## Setup

1. Install dependencies:
```bash
npm install
```

2. Get a Mapbox access token:
   - Sign up at https://www.mapbox.com/
   - Get your access token from the account page
   - Replace the token in `app.js` (line 2)

3. Run the application:
```bash
npm start
```

Or simply open `index.html` in a browser.

## Usage

1. Click "Request a Demo" to authenticate (any credentials work for demo)
2. Click "Explore Our Solutions" to view the 3D map
3. Select an organization and space from the dropdowns
4. Interact with the 3D map - zoom, pan, and click on markers

## Technologies

- HTML5
- CSS3
- JavaScript (Vanilla)
- Mapbox GL JS (for 3D maps)

## Color Scheme

- Primary: Black (#0a0a0a) and White (#ffffff)
- Accents: Green (#00d4aa) and Blue (#00a8cc)

## Notes

- This is a demo/prototype version
- Authentication is mocked for presentation purposes
- Map requires a valid Mapbox access token for full functionality

