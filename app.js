// Mapbox access token - Replace with your own token for production
// Get your token from: https://account.mapbox.com/access-tokens/
// For demo: You can use a public token or get your own free token
// NOTE: Replace this with your own Mapbox token for full functionality
const defaultToken = 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';
mapboxgl.accessToken = defaultToken;

let map = null;
let isAuthenticated = false;

// Initialize map when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is already authenticated
    const authStatus = localStorage.getItem('twinner_auth');
    if (authStatus === 'authenticated') {
        isAuthenticated = true;
    }
});

// Authentication Modal Functions
function showAuthModal() {
    document.getElementById('authModal').classList.remove('hidden');
}

function closeAuthModal() {
    document.getElementById('authModal').classList.add('hidden');
}

function handleAuth(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const organization = document.getElementById('organization').value;
    
    // Mock authentication - accept any credentials
    isAuthenticated = true;
    localStorage.setItem('twinner_auth', 'authenticated');
    localStorage.setItem('twinner_email', email);
    localStorage.setItem('twinner_org', organization);
    
    closeAuthModal();
    
    // Show success message
    alert('Authentication successful! Welcome to TWINNER.');
    
    // Optionally navigate to map
    navigateToMap();
}

// Navigation Functions
function navigateToMap() {
    if (!isAuthenticated) {
        showAuthModal();
        return;
    }
    
    // Hide landing page content
    document.querySelector('.hero').style.display = 'none';
    document.querySelector('.main-content').style.display = 'none';
    document.querySelector('.bottom-banner').style.display = 'none';
    document.querySelector('.header').style.display = 'none';
    document.querySelector('.footer').style.display = 'none';
    
    // Show map view
    const mapView = document.getElementById('mapView');
    mapView.classList.remove('hidden');
    
    // Initialize 3D map
    init3DMap();
    
    // Populate organization select
    populateOrganizationSelect();
}

function closeMapView() {
    // Show landing page content
    document.querySelector('.hero').style.display = 'flex';
    document.querySelector('.main-content').style.display = 'block';
    document.querySelector('.bottom-banner').style.display = 'block';
    document.querySelector('.header').style.display = 'block';
    document.querySelector('.footer').style.display = 'block';
    
    // Hide map view
    document.getElementById('mapView').classList.add('hidden');
    
    // Clean up map if it exists
    if (map) {
        map.remove();
        map = null;
    }
}

// Initialize 3D Map for South Africa
function init3DMap() {
    if (map) {
        return; // Map already initialized
    }
    
    if (!mapboxgl.accessToken) {
        alert('Mapbox access token required. Please add your token in app.js');
        return;
    }
    
    // Center on South Africa (Johannesburg area)
    const southAfricaCenter = [28.0473, -26.2041]; // Johannesburg coordinates
    
    try {
        map = new mapboxgl.Map({
            container: 'map3d',
            style: 'mapbox://styles/mapbox/satellite-v9', // Satellite style for better 3D effect
            center: southAfricaCenter,
            zoom: 15,
            pitch: 60, // Tilt for 3D effect
            bearing: -17.6,
            antialias: true,
            projection: 'globe' // Enable globe projection for better 3D
        });
    } catch (error) {
        console.error('Error initializing map:', error);
        alert('Error loading map. Please check your Mapbox token.');
        return;
    }
    
    // Add 3D terrain and buildings
    map.on('load', () => {
        try {
            // Add terrain source
            map.addSource('mapbox-dem', {
                'type': 'raster-dem',
                'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
                'tileSize': 512,
                'maxzoom': 14
            });
            
            // Set terrain with exaggeration for South African topography
            map.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });
            
            // Add sky layer for atmosphere
            map.addLayer({
                'id': 'sky',
                'type': 'sky',
                'paint': {
                    'sky-type': 'atmosphere',
                    'sky-atmosphere-sun': [0.0, 0.0],
                    'sky-atmosphere-sun-intensity': 15
                }
            });
            
            // Add 3D buildings layer
            map.addLayer({
                'id': '3d-buildings',
                'source': 'composite',
                'source-layer': 'building',
                'filter': ['==', 'extrude', 'true'],
                'type': 'fill-extrusion',
                'minzoom': 14,
                'paint': {
                    'fill-extrusion-color': [
                        'interpolate',
                        ['linear'],
                        ['get', 'height'],
                        0, '#00d4aa',
                        50, '#00a8cc',
                        100, '#4a90e2'
                    ],
                    'fill-extrusion-height': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        15, 0,
                        15.05, ['get', 'height']
                    ],
                    'fill-extrusion-base': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        15, 0,
                        15.05, ['get', 'min_height']
                    ],
                    'fill-extrusion-opacity': 0.7
                }
            });
            
            // Add sample markers for South African locations
            addSampleMarkers();
            
            // Add navigation controls
            map.addControl(new mapboxgl.NavigationControl(), 'top-right');
            
            // Add scale control
            map.addControl(new mapboxgl.ScaleControl({
                maxWidth: 100,
                unit: 'metric'
            }), 'bottom-left');
            
        } catch (error) {
            console.error('Error adding map layers:', error);
            // Still add markers even if 3D layers fail
            addSampleMarkers();
        }
    });
    
    // Add click handler for map
    map.on('click', (e) => {
        const coordinates = e.lngLat;
        console.log('Clicked at:', coordinates);
        
        // You can add custom markers or popups here
        new mapboxgl.Popup()
            .setLngLat(coordinates)
            .setHTML(`
                <div style="padding: 0.5rem;">
                    <h4>Location</h4>
                    <p>Lat: ${coordinates.lat.toFixed(4)}</p>
                    <p>Lng: ${coordinates.lng.toFixed(4)}</p>
                </div>
            `)
            .addTo(map);
    });
}

// Add sample markers for demonstration
function addSampleMarkers() {
    // Sample locations in South Africa
    const locations = [
        {
            name: 'Centurion Mall',
            coordinates: [28.1853, -25.8603],
            color: '#00d4aa'
        },
        {
            name: 'Sandton City',
            coordinates: [28.0531, -26.1076],
            color: '#00a8cc'
        },
        {
            name: 'V&A Waterfront',
            coordinates: [18.4232, -33.9056],
            color: '#7ed321'
        }
    ];
    
    locations.forEach(location => {
        const el = document.createElement('div');
        el.className = 'marker';
        el.style.width = '20px';
        el.style.height = '20px';
        el.style.borderRadius = '50%';
        el.style.backgroundColor = location.color;
        el.style.border = '2px solid white';
        el.style.cursor = 'pointer';
        
        new mapboxgl.Marker(el)
            .setLngLat(location.coordinates)
            .setPopup(
                new mapboxgl.Popup({ offset: 25 })
                    .setHTML(`<h4>${location.name}</h4><p>South Africa</p>`)
            )
            .addTo(map);
    });
}

// Populate organization select
function populateOrganizationSelect() {
    const orgSelect = document.getElementById('organizationSelect');
    const savedOrg = localStorage.getItem('twinner_org');
    
    const organizations = [
        'Redefine Retail',
        'Growthpoint Properties',
        'Hyprop Investments',
        'Vukile Property Fund'
    ];
    
    organizations.forEach(org => {
        const option = document.createElement('option');
        option.value = org;
        option.textContent = org;
        if (org === savedOrg) {
            option.selected = true;
        }
        orgSelect.appendChild(option);
    });
    
    // Update space select based on organization
    orgSelect.addEventListener('change', (e) => {
        updateSpaceSelect(e.target.value);
    });
    
    if (savedOrg) {
        updateSpaceSelect(savedOrg);
    }
}

function updateSpaceSelect(organization) {
    const spaceSelect = document.getElementById('spaceSelect');
    spaceSelect.innerHTML = '<option>Select Space</option>';
    
    // Sample spaces based on organization
    const spaces = {
        'Redefine Retail': ['Centurion Mall', 'Hyde Park Corner', 'Clearwater Mall'],
        'Growthpoint Properties': ['Sandton City', 'Eastgate Shopping Centre', 'Menlyn Park'],
        'Hyprop Investments': ['Cavendish Square', 'The Glen', 'Cresta Shopping Centre'],
        'Vukile Property Fund': ['Mall of the South', 'The Zone @ Rosebank', 'Bayside Mall']
    };
    
    const orgSpaces = spaces[organization] || ['Centurion Mall', 'Sandton City'];
    
    orgSpaces.forEach(space => {
        const option = document.createElement('option');
        option.value = space;
        option.textContent = space;
        spaceSelect.appendChild(option);
    });
    
    // Update map when space is selected
    spaceSelect.addEventListener('change', (e) => {
        if (e.target.value !== 'Select Space' && map) {
            // Center map on selected space
            const spaceCoordinates = {
                'Centurion Mall': [28.1853, -25.8603],
                'Sandton City': [28.0531, -26.1076],
                'Hyde Park Corner': [28.0128, -26.1314],
                'Clearwater Mall': [28.1106, -25.7894],
                'Eastgate Shopping Centre': [28.0889, -26.1708],
                'Menlyn Park': [28.2325, -25.7831],
                'Cavendish Square': [18.4706, -33.9886],
                'The Glen': [28.0508, -26.2381],
                'Cresta Shopping Centre': [28.0036, -26.1450],
                'Mall of the South': [28.0556, -26.2708],
                'The Zone @ Rosebank': [28.0431, -26.1464],
                'Bayside Mall': [18.4232, -33.9056]
            };
            
            const coords = spaceCoordinates[e.target.value];
            if (coords) {
                map.flyTo({
                    center: coords,
                    zoom: 16,
                    pitch: 60,
                    bearing: -17.6,
                    duration: 2000
                });
            }
        }
    });
}

// Map Controls
function zoomIn() {
    if (map) {
        map.zoomIn();
    }
}

function zoomOut() {
    if (map) {
        map.zoomOut();
    }
}

function toggleFullscreen() {
    const mapView = document.getElementById('mapView');
    if (!document.fullscreenElement) {
        mapView.requestFullscreen().catch(err => {
            console.log('Error attempting to enable fullscreen:', err);
        });
    } else {
        document.exitFullscreen();
    }
}

// 3DGS and 360° button handlers
document.addEventListener('DOMContentLoaded', () => {
    const btn3dgs = document.getElementById('btn3dgs');
    const btn360 = document.getElementById('btn360');
    
    if (btn3dgs) {
        btn3dgs.addEventListener('click', () => {
            alert('3D Gaussian Splatting view - Coming soon!');
        });
    }
    
    if (btn360) {
        btn360.addEventListener('click', () => {
            alert('360° view - Coming soon!');
        });
    }
});

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('authModal');
    if (event.target === modal) {
        closeAuthModal();
    }
}

// Handle escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeAuthModal();
    }
});


