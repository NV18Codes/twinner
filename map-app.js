// Map Application Logic
let map = null;
let markers = [];
let sidebarOpen = false;
let isAuthenticated = false;
let allMarkers = []; // Store all markers for search functionality
let currentSearchCategory = 'all';
let drawControl = null;
let drawnItems = null; // For annotations
let currentTileLayer = null; // For switching between map types

// Asset Type colors (matching reference design)
const assetTypeColors = {
    'solar': '#ff9800',      // Orange
    'equipment': '#9c27b0',  // Purple
    'building': '#2196f3',    // Blue
    'infrastructure': '#4caf50', // Green
    'other': '#607d8b'        // Blue Grey
};

// Initialize application
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication status and update UI
    await checkAuthStatus();
    await updateUIForAuth();
    
    // Wait for Leaflet to be available
    if (typeof L === 'undefined') {
        console.error('Leaflet not loaded. Please check script loading order.');
        document.getElementById('map').innerHTML = '<div style="padding: 2rem; text-align: center; color: #fff; background: #000;"><h3>Map Library Not Loaded</h3><p>Please check your internet connection and refresh the page.</p></div>';
        return;
    }
    
    // Initialize map first (before database)
    initMap();
    
    // Initialize database
    const dbReady = await initDatabase();
    if (!dbReady) {
        console.warn('Failed to initialize database. Some features may not work.');
    }
    
    // Markers will be loaded when map fires 'load' event (handled in initMap)
    
    // Setup event listeners
    // Category filter removed from navbar - can be added to sidebar if needed
    
    // Auto-extract EXIF when file is selected
    const mediaFile = document.getElementById('mediaFile');
    if (mediaFile) {
        mediaFile.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            const locationStatus = document.getElementById('locationStatus');
            const latInput = document.getElementById('latitude');
            const lngInput = document.getElementById('longitude');
            
            if (!file) return;
            
            if (file.type.startsWith('image/')) {
                // Show image preview
                const preview = document.getElementById('imagePreview');
                const previewImg = document.getElementById('previewImg');
                if (preview && previewImg) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        previewImg.src = e.target.result;
                        previewImg.style.display = 'block';
                        // Hide video element if it exists
                        const previewVideo = document.getElementById('previewVideo');
                        if (previewVideo) previewVideo.style.display = 'none';
                        preview.style.display = 'block';
                    };
                    reader.readAsDataURL(file);
                }
            } else if (file.type.startsWith('video/')) {
                // Show video preview
                const preview = document.getElementById('imagePreview');
                const previewVideo = document.getElementById('previewVideo');
                if (preview && previewVideo) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        previewVideo.src = e.target.result;
                        previewVideo.style.display = 'block';
                        // Hide image element if it exists
                        const previewImg = document.getElementById('previewImg');
                        if (previewImg) previewImg.style.display = 'none';
                        preview.style.display = 'block';
                    };
                    reader.readAsDataURL(file);
                }
            }
            
            if (file.type.startsWith('image/')) {
                // Check if EXIF library is loaded
                if (typeof EXIF === 'undefined') {
                    console.error('EXIF.js library not loaded');
                    locationStatus.textContent = 'EXIF library not available. Please refresh the page or use "Click on Map".';
                    locationStatus.style.color = '#f44336';
                    latInput.removeAttribute('readonly');
                    lngInput.removeAttribute('readonly');
                    latInput.required = true;
                    lngInput.required = true;
                    return;
                }
                
                locationStatus.textContent = 'Extracting geotags from image...';
                locationStatus.style.color = '#2196f3';
                
                // Try multiple extraction methods
                let extracted = false;
                
                // Method 1: Try EXIF extraction
                try {
                    const exifData = await getExifData(file);
                    if (exifData && exifData.latitude && exifData.longitude) {
                        const lat = exifData.latitude;
                        const lng = exifData.longitude;
                        
                        // Validate coordinates are reasonable
                        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                            latInput.value = lat; // Preserve full precision
                            lngInput.value = lng; // Preserve full precision
                            latInput.removeAttribute('readonly');
                            lngInput.removeAttribute('readonly');
                            locationStatus.textContent = '✓ Location detected from EXIF geotags!';
                            locationStatus.style.color = '#23d18b';
                            
                            // Also fetch and display address
                            getLocationAddressCached(lat, lng).then(address => {
                                locationStatus.textContent = `✓ Location: ${address}`;
                            });
                            extracted = true;
                        }
                    }
                } catch (error) {
                    console.log('EXIF extraction failed:', error);
                }
                
                // Method 2: Try OCR to extract coordinates from image text (if coordinates are visible in image)
                if (!extracted) {
                    try {
                        locationStatus.textContent = 'Trying OCR to extract coordinates from image...';
                        locationStatus.style.color = '#2196f3';
                        
                        const ocrCoords = await extractCoordinatesWithOCR(file);
                        if (ocrCoords && ocrCoords.latitude && ocrCoords.longitude) {
                            const lat = ocrCoords.latitude;
                            const lng = ocrCoords.longitude;
                            
                            // Check if within South Africa bounds
                            if (lat > -22 || lat < -35 || lng < 16 || lng > 33) {
                                locationStatus.textContent = `⚠ Coordinates (${lat.toFixed(6)}, ${lng.toFixed(6)}) are outside South Africa. Please verify.`;
                                locationStatus.style.color = '#ff9800';
                            } else {
                                locationStatus.textContent = '✓ Location detected from image text (OCR)!';
                                locationStatus.style.color = '#23d18b';
                                extracted = true;
                            }
                            
                            latInput.value = lat; // Preserve full precision
                            lngInput.value = lng; // Preserve full precision
                            latInput.removeAttribute('readonly');
                            lngInput.removeAttribute('readonly');
                            
                            getLocationAddressCached(lat, lng).then(address => {
                                locationStatus.textContent = `✓ Location: ${address}`;
                            });
                        }
                    } catch (error) {
                        console.log('OCR extraction failed:', error);
                    }
                }
                
                // Method 3: Try extracting from image text/overlay (if coordinates are visible in image)
                if (!extracted) {
                    try {
                        const textCoords = await extractCoordinatesFromImageText(file);
                        if (textCoords && textCoords.latitude && textCoords.longitude) {
                            latInput.value = textCoords.latitude; // Preserve full precision
                            lngInput.value = textCoords.longitude; // Preserve full precision
                            latInput.removeAttribute('readonly');
                            lngInput.removeAttribute('readonly');
                            locationStatus.textContent = '✓ Location detected from image text!';
                            locationStatus.style.color = '#23d18b';
                            
                            getLocationAddressCached(textCoords.latitude, textCoords.longitude).then(address => {
                                locationStatus.textContent = `✓ Location: ${address}`;
                            });
                            extracted = true;
                        }
                    } catch (error) {
                        console.log('Text extraction failed:', error);
                    }
                }
                
                // If still no coordinates found
                if (!extracted) {
                    locationStatus.textContent = 'No geotags found. Use "Click on Map" to set location, or enter coordinates manually.';
                    locationStatus.style.color = '#ff9800';
                    latInput.removeAttribute('readonly');
                    lngInput.removeAttribute('readonly');
                    latInput.required = true;
                    lngInput.required = true;
                    
                    // Show manual coordinate input helper
                    const manualInput = document.getElementById('manualCoordInput');
                    if (manualInput) {
                        manualInput.style.display = 'block';
                    }
                }
            } else if (file.type.startsWith('video/')) {
                // Video file - no EXIF, need manual location
                locationStatus.textContent = 'Videos don\'t have geotags. Use "Click on Map", "Use Current Location", or enter coordinates manually.';
                locationStatus.style.color = '#ff9800';
                latInput.removeAttribute('readonly');
                lngInput.removeAttribute('readonly');
                latInput.required = true;
                lngInput.required = true;
                
                // Show manual coordinate input helper
                const manualInput = document.getElementById('manualCoordInput');
                if (manualInput) {
                    manualInput.style.display = 'block';
                }
            } else {
                locationStatus.textContent = 'Unsupported file type. Please select an image or video.';
                locationStatus.style.color = '#f44336';
            }
        });
    }
    
    // Update UI based on auth status
    updateUIForAuth();
});

// Check authentication status
async function checkAuthStatus() {
    const authStatus = sessionStorage.getItem('twinner_auth');
    const token = sessionStorage.getItem('twinner_token');
    
    if (authStatus === 'authenticated' && token) {
        // Verify token is still valid by checking with API
        try {
            const response = await fetch(getApiUrl('/api/auth/verify'), {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                isAuthenticated = true;
                // Update user info if needed
                if (data.user) {
                    sessionStorage.setItem('twinner_email', data.user.email);
                    sessionStorage.setItem('twinner_user_id', data.user.id);
                }
            } else if (response.status === 404) {
                // Server route not found - use sessionStorage as fallback (server might be starting)
                console.warn('Auth verify endpoint returned 404 - using sessionStorage');
                isAuthenticated = true; // Trust sessionStorage if route doesn't exist yet
            } else {
                // Token invalid (401, 500, etc), clear auth
                console.log('Token invalid, clearing auth. Status:', response.status);
                sessionStorage.removeItem('twinner_auth');
                sessionStorage.removeItem('twinner_token');
                sessionStorage.removeItem('twinner_email');
                sessionStorage.removeItem('twinner_user_id');
                isAuthenticated = false;
            }
        } catch (error) {
            console.error('Auth verification error:', error);
            // If API is not available (network error), use sessionStorage as fallback
            console.warn('API not available, using sessionStorage for auth');
            isAuthenticated = authStatus === 'authenticated';
        }
    } else {
        isAuthenticated = false;
    }
}

// Update UI based on authentication
async function updateUIForAuth() {
    // Force check auth status first
    await checkAuthStatus();
    
    const signInBtn = document.getElementById('signInBtn');
    const signUpBtn = document.getElementById('signUpBtn');
    const requestDemoBtn = document.getElementById('requestDemoBtn');
    const uploadBtn = document.getElementById('uploadBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (isAuthenticated) {
        // Hide "Sign In", "Sign Up", and "Request a Demo", show upload and logout buttons
        if (signInBtn) {
            signInBtn.classList.add('hidden');
            signInBtn.style.display = 'none';
        }
        if (signUpBtn) {
            signUpBtn.classList.add('hidden');
            signUpBtn.style.display = 'none';
        }
        if (requestDemoBtn) {
            requestDemoBtn.classList.add('hidden');
            requestDemoBtn.style.display = 'none';
        }
        if (uploadBtn) {
            uploadBtn.classList.remove('hidden');
            uploadBtn.style.display = 'inline-block';
            uploadBtn.textContent = 'Upload Media';
            uploadBtn.onclick = () => showUploadModal();
        }
        if (logoutBtn) {
            logoutBtn.classList.remove('hidden');
            logoutBtn.style.display = 'inline-block';
        }
    } else {
        // Show "Sign In", "Sign Up", and "Request a Demo", hide upload and logout buttons
        if (signInBtn) {
            signInBtn.classList.remove('hidden');
            signInBtn.style.display = 'inline-block';
        }
        if (signUpBtn) {
            signUpBtn.classList.remove('hidden');
            signUpBtn.style.display = 'inline-block';
        }
        if (requestDemoBtn) {
            requestDemoBtn.classList.remove('hidden');
            requestDemoBtn.style.display = 'inline-block';
        }
        if (uploadBtn) {
            uploadBtn.classList.add('hidden');
            uploadBtn.style.display = 'none';
        }
        if (logoutBtn) {
            logoutBtn.classList.add('hidden');
            logoutBtn.style.display = 'none';
        }
    }
    
    console.log('UI updated for auth status:', isAuthenticated);
}

// Handle logout (exposed globally)
window.handleLogout = async function handleLogout() {
    const token = sessionStorage.getItem('twinner_token');
    
    if (token) {
        try {
            // Call logout API
            await fetch(getApiUrl('/api/auth/logout'), {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        } catch (error) {
            console.error('Logout API error:', error);
        }
    }
    
    // Clear session storage
    sessionStorage.removeItem('twinner_token');
    sessionStorage.removeItem('twinner_email');
    sessionStorage.removeItem('twinner_user_id');
    sessionStorage.removeItem('twinner_auth');
    
    // Update auth state
    isAuthenticated = false;
    
    // Update UI
    await updateUIForAuth();
    
    // Reload markers to show all media (public view)
    await loadMarkersFromAPI('all');
    
    alert('Logged out successfully');
}

// Handle search functionality
window.handleSearch = function handleSearch() {
    const searchSelect = document.getElementById('searchCategory');
    const category = searchSelect ? searchSelect.value : 'all';
    currentSearchCategory = category;
    applySearchFilter(category);
}

// Apply search filter - highlight matching pins and zoom to show them
function applySearchFilter(category) {
    if (!map || allMarkers.length === 0) {
        return;
    }
    
    const matchingMarkers = [];
    const bounds = L.latLngBounds([]);
    
    // Filter and highlight markers
    allMarkers.forEach(({ marker, location, category: markerCategory }) => {
        const markerEl = marker._icon || marker.getElement();
        
        if (category === 'all' || markerCategory === category) {
            // Show and highlight this marker
            if (markerEl) {
                markerEl.style.opacity = '1';
                markerEl.style.transform = 'scale(1)';
                markerEl.style.filter = 'none';
                markerEl.style.border = '4px solid #ffffff';
                markerEl.style.boxShadow = '0 3px 6px rgba(0,0,0,0.4)';
            }
            
            // Add to bounds for zooming (Leaflet uses [lat, lng])
            bounds.extend([location.lat, location.lng]);
            matchingMarkers.push(marker);
        } else {
            // Hide or dim non-matching markers
            if (markerEl) {
                markerEl.style.opacity = '0.3';
                markerEl.style.filter = 'grayscale(100%)';
                markerEl.style.border = '2px solid #cccccc';
            }
        }
    });
    
    // Zoom to show all matching markers
    if (matchingMarkers.length > 0) {
        if (matchingMarkers.length === 1) {
            // Single marker - zoom to it
            const marker = matchingMarkers[0];
            const latLng = marker.getLatLng();
            map.flyTo(latLng, 15, {
                duration: 1.0
            });
        } else {
            // Multiple markers - fit bounds
            try {
                map.flyToBounds(bounds, {
                    padding: [100, 100],
                    maxZoom: 15,
                    duration: 1.0
                });
            } catch (error) {
                console.error('Error fitting bounds:', error);
                // Fallback: zoom to center of bounds
                const center = bounds.getCenter();
                map.flyTo(center, 12, {
                    duration: 1.0
                });
            }
        }
        
        console.log(`✅ Search: Showing ${matchingMarkers.length} markers for category "${category}"`);
    } else {
        console.log(`⚠️ Search: No markers found for category "${category}"`);
    }
}

// Initialize Leaflet map (matching reference design)
function initMap() {
    try {
        // Check if Leaflet is loaded
        if (typeof L === 'undefined') {
            console.error('Leaflet not loaded');
            document.getElementById('map').innerHTML = '<div style="padding: 2rem; text-align: center; color: #fff; background: #000;"><h3>Map Loading Error</h3><p>Leaflet library failed to load. Please check your internet connection.</p></div>';
            return;
        }

        // Center on South Africa (Johannesburg)
        // Leaflet uses [lat, lng] format
        // Start with satellite view (matching reference)
        map = L.map('map', {
            center: [-26.2041, 28.0473], // [lat, lng] - Johannesburg
            zoom: 15,
            zoomControl: true
        });
        
        // Initialize drawn items for annotations
        drawnItems = new L.FeatureGroup();
        map.addLayer(drawnItems);
        
        // Add satellite tile layer (Google Satellite style via OpenStreetMap)
        const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Leaflet | Google',
            maxZoom: 19
        });
        
        // Add street tile layer
        const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Leaflet',
            maxZoom: 19
        });
        
        // Start with satellite view (matching reference)
        currentTileLayer = satelliteLayer;
        satelliteLayer.addTo(map);
        
        // Store layers for switching
        map.satelliteLayer = satelliteLayer;
        map.streetLayer = streetLayer;
        
        // Wait for map to load
        map.whenReady(() => {
            console.log('Map loaded successfully');
            
            // Initialize Leaflet Draw for annotations
            // This creates the built-in toolbar (no need for custom controls)
            const drawOptions = {
                position: 'topright',
                draw: {
                    marker: true,
                    polyline: true,
                    polygon: true,
                    rectangle: true,
                    circle: true,
                    circlemarker: false
                },
                edit: {
                    featureGroup: drawnItems,
                    remove: true
                }
            };
            
            drawControl = new L.Control.Draw(drawOptions);
            map.addControl(drawControl);
            
            // Leaflet Draw automatically shows its toolbar - no custom controls needed
            
            // Handle drawing events
            map.on(L.Draw.Event.CREATED, function (e) {
                const layer = e.layer;
                drawnItems.addLayer(layer);
                console.log('Annotation created:', e.layerType);
            });
            
            // Load markers after map is ready
            loadMarkers();
        });
        
        // Add style switcher (Street/Satellite toggle) - custom Leaflet control
        const StyleSwitcherControl = L.Control.extend({
            onAdd: function(map) {
                const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
                container.innerHTML = `
                    <button id="satelliteStyle" class="style-btn active" title="Satellite View">🛰️</button>
                    <button id="streetStyle" class="style-btn" title="Street Map">🗺️</button>
                `;
                L.DomEvent.disableClickPropagation(container);
                
                const streetBtn = container.querySelector('#streetStyle');
                const satelliteBtn = container.querySelector('#satelliteStyle');
                
                streetBtn.addEventListener('click', () => {
                    map.removeLayer(currentTileLayer);
                    currentTileLayer = map.streetLayer;
                    currentTileLayer.addTo(map);
                    streetBtn.classList.add('active');
                    satelliteBtn.classList.remove('active');
                });
                
                satelliteBtn.addEventListener('click', () => {
                    map.removeLayer(currentTileLayer);
                    currentTileLayer = map.satelliteLayer;
                    currentTileLayer.addTo(map);
                    satelliteBtn.classList.add('active');
                    streetBtn.classList.remove('active');
                });
                
                return container;
            }
        });
        
        map.addControl(new StyleSwitcherControl({ position: 'topright' }));
        
        // Add geolocate control
        const geolocateControl = L.control({ position: 'topright' });
        geolocateControl.onAdd = function(map) {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
            const button = L.DomUtil.create('button', 'geolocate-btn');
            button.innerHTML = '📍';
            button.title = 'Get Current Location';
            button.onclick = () => {
                map.locate({ setView: true, maxZoom: 16 });
            };
            container.appendChild(button);
            L.DomEvent.disableClickPropagation(container);
            return container;
        };
        map.addControl(geolocateControl);
        
        // Add click handler for map - allow setting location by clicking
        map.on('click', (e) => {
            // If upload modal is open, set coordinates from map click
            const uploadModal = document.getElementById('uploadModal');
            if (uploadModal && !uploadModal.classList.contains('hidden')) {
                const latInput = document.getElementById('latitude');
                const lngInput = document.getElementById('longitude');
                const locationStatus = document.getElementById('locationStatus');
                
                if (latInput && lngInput) {
                    latInput.value = e.latlng.lat; // Leaflet uses latlng
                    lngInput.value = e.latlng.lng;
                    latInput.removeAttribute('readonly');
                    lngInput.removeAttribute('readonly');
                    
                    // Get address for clicked location
                    locationStatus.textContent = 'Getting address...';
                    locationStatus.style.color = '#2196f3';
                    getLocationAddressCached(e.latlng.lat, e.latlng.lng).then(address => {
                        locationStatus.textContent = `✓ Location set: ${address}`;
                        locationStatus.style.color = '#23d18b';
                    });
                }
            }
        });
        
    } catch (error) {
        console.error('Error initializing map:', error);
        document.getElementById('map').innerHTML = `<div style="padding: 2rem; text-align: center; color: #fff; background: #000;"><h3>Map Initialization Error</h3><p>${error.message}</p></div>`;
    }
}

// Load markers from API (SQLite on server)
async function loadMarkersFromAPI(categoryFilter = 'all') {
    if (!map) {
        console.error('Map not initialized');
        return;
    }
    
    try {
        // Check if user is authenticated
        const token = sessionStorage.getItem('twinner_token');
        const headers = {};
        
        // If authenticated, include token to get only user's media
        // If not authenticated, no token = get all media
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        // Fetch media from API
        let url = getApiUrl('/api/media');
        if (categoryFilter !== 'all') {
            url += `?category=${categoryFilter}`;
        }
        
        console.log('Fetching media from API:', url, token ? '(authenticated - user media only)' : '(public - all media)');
        const response = await fetch(url, {
            headers: headers
        });
        
        if (!response.ok) {
            console.error('API response not OK:', response.status, response.statusText);
            const errorText = await response.text();
            console.error('Error response:', errorText);
            return;
        }
        
        const data = await response.json();
        console.log('Media data received:', data.media ? data.media.length : 0, 'items');
        
        // Clear existing markers
        markers.forEach(marker => marker.remove());
        markers = [];
        allMarkers = []; // Clear all markers array
        
        if (!data.media || data.media.length === 0) {
            console.log('No media found');
            updateSidebar([]);
            return;
        }
        
        // Group media by location and category
        const locationMap = new Map();
        
        data.media.forEach(item => {
            const key = `${item.latitude.toFixed(6)}_${item.longitude.toFixed(6)}_${item.category}`;
            if (!locationMap.has(key)) {
                locationMap.set(key, {
                    lat: item.latitude,
                    lng: item.longitude,
                    category: item.category,
                    media: []
                });
            }
            locationMap.get(key).media.push(item);
        });
        
        const locations = Array.from(locationMap.values());
        
        if (locations.length === 0) {
            console.log('No locations found');
            updateSidebar([]);
            return;
        }
        
        // Create markers for each location
        locations.forEach((location, index) => {
            const color = assetTypeColors[location.category] || assetTypeColors.other;
            
            // Validate coordinates
            if (isNaN(location.lat) || isNaN(location.lng)) {
                console.error('❌ Invalid coordinates for location:', location);
                return;
            }
            
            // Ensure coordinates are within valid range
            if (location.lat < -90 || location.lat > 90 || location.lng < -180 || location.lng > 180) {
                console.error('❌ Coordinates out of range:', location);
                return;
            }
            
            console.log(`📍 Creating marker ${index + 1}/${locations.length}:`, {
                lat: location.lat,
                lng: location.lng,
                category: location.category,
                mediaCount: location.media.length
            });
            
            // Create custom marker element - make it more visible
            const el = document.createElement('div');
            el.className = 'custom-marker';
            el.style.background = color;
            el.style.width = '35px';
            el.style.height = '35px';
            el.style.borderRadius = '50%';
            el.style.border = '4px solid #ffffff';
            el.style.cursor = 'pointer';
            el.style.boxShadow = '0 3px 6px rgba(0,0,0,0.4)';
            el.style.zIndex = '1000';
            el.style.position = 'relative';
            el.style.transition = 'all 0.2s ease';
            
            // Create Leaflet marker
            const markerLatLng = [location.lat, location.lng];
            const marker = L.marker(markerLatLng, {
                icon: L.divIcon({
                    className: 'custom-marker-icon',
                    html: el.outerHTML,
                    iconSize: [35, 35],
                    iconAnchor: [17, 35],
                    popupAnchor: [0, -35]
                }),
                draggable: false
            });
            
            // Create popup with media info
            const popup = L.popup({ 
                offset: [0, -35],
                closeOnClick: true,
                closeButton: true
            })
                .setContent(createPopupContent(location.media, location.category));
            
            marker.bindPopup(popup).addTo(map);
            
            // Store location data in marker for reference
            marker._data = {
                lat: location.lat,
                lng: location.lng,
                category: location.category
            };
            
            // Show popup on hover (not just click)
            marker.on('mouseover', () => {
                el.style.transform = 'scale(1.2)';
                el.style.transition = 'transform 0.2s';
                // Open popup on hover
                if (!marker.isPopupOpen()) {
                    marker.openPopup();
                }
            });
            marker.on('mouseout', () => {
                el.style.transform = 'scale(1)';
                // Keep popup open on mouseleave - user can click to close
            });
            
            markers.push(marker);
            allMarkers.push({
                marker: marker,
                location: location,
                category: location.category
            });
        });
        
        // Update sidebar
        updateSidebar(locations);
        
        // Apply current search filter
        applySearchFilter(currentSearchCategory);
        
        console.log(`Loaded ${locations.length} locations from API`);
    } catch (error) {
        console.error('Error loading markers from API:', error);
    }
}

// Create popup content for markers
function createPopupContent(mediaItems, category) {
    const color = assetTypeColors[category] || assetTypeColors.other;
    
    // Show first image as thumbnail if available
    const firstImage = mediaItems.find(m => m.file_type === 'image');
    let thumbnailHtml = '';
    if (firstImage && firstImage.file_data) {
        // Ensure base64 data has proper prefix
        let imageSrc = firstImage.file_data;
        if (!imageSrc.startsWith('data:')) {
            // If it's just base64, add the data URI prefix
            // Try to detect image type from filename or default to jpeg
            const ext = firstImage.filename.toLowerCase().split('.').pop();
            const mimeType = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
            imageSrc = `data:${mimeType};base64,${imageSrc}`;
        }
        thumbnailHtml = `<div style="margin-bottom: 0.75rem; border-radius: 6px; overflow: hidden; background: #f5f5f5;">
            <img src="${imageSrc}" alt="${firstImage.filename}" 
                 style="width: 100%; max-height: 150px; object-fit: cover; display: block;"
                 onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=\\'padding: 1rem; text-align: center; color: #999;\\'>Image unavailable</div>';">
        </div>`;
    }
    
    const mediaDetails = mediaItems.map((m, index) => {
        const date = new Date(m.upload_date).toLocaleDateString();
        const isFirst = index === 0;
        return `<div style="border-bottom: 1px solid #eee; padding: 0.5rem 0; font-size: 0.85rem; ${isFirst ? 'padding-top: 0;' : ''}">
            <strong>${m.filename}</strong><br>
            <span style="color: #666;">${m.description || 'No description'}</span><br>
            <span style="color: #999; font-size: 0.75rem;">${date}</span>
        </div>`;
    }).join('');
    
    return `
        <div style="padding: 0.5rem; min-width: 250px; max-width: 350px;">
            <h4 style="margin-bottom: 0.5rem; font-size: 1rem; color: ${color};">
                ${getCategoryName(category)}
            </h4>
            <p style="margin: 0 0 0.75rem 0; color: #666; font-size: 0.9rem;">
                <strong>${mediaItems.length}</strong> item(s) at this location
            </p>
            ${thumbnailHtml}
            <div style="max-height: 200px; overflow-y: auto; margin-bottom: 0.5rem; padding: 0.5rem; background: #f5f5f5; border-radius: 4px;">
                ${mediaDetails || '<p style="font-size: 0.85rem; color: #666;">No details available</p>'}
            </div>
            <button onclick="showGallery(${mediaItems[0].latitude}, ${mediaItems[0].longitude}, '${category}')" 
                    style="margin-top: 0.5rem; padding: 0.5rem; background: ${color}; color: #fff; border: none; border-radius: 4px; cursor: pointer; width: 100%; font-weight: 600;">
                View All Media
            </button>
        </div>
    `;
}

// Load markers from database (legacy - now uses API)
function loadMarkers(categoryFilter = 'all') {
    // Use API instead
    loadMarkersFromAPI(categoryFilter);
}

// Legacy function - kept for compatibility but not used
function loadMarkersLegacy(categoryFilter = 'all') {
    if (!map) {
        console.error('Map not initialized');
        return;
    }
    
    // Clear existing markers
    markers.forEach(marker => marker.remove());
    markers = [];
    
    // Get grouped locations
    const locations = getGroupedLocations(categoryFilter);
    
    if (locations.length === 0) {
        console.log('No locations found in database');
        updateSidebar([]);
        return;
    }
    
    locations.forEach(location => {
        const color = assetTypeColors[location.category] || assetTypeColors.other;
        const media = getMediaByLocation(location.lat, location.lng);
        
        // Create custom marker element
        const el = document.createElement('div');
        el.className = 'custom-marker';
        el.style.background = color;
        el.style.width = '30px';
        el.style.height = '30px';
        el.style.borderRadius = '50% 50% 50% 0';
        el.style.transform = 'rotate(-45deg)';
        el.style.border = '2px solid #fff';
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        el.style.cursor = 'pointer';
        
        // Create detailed popup content
        const mediaDetails = media.map(m => {
            const date = new Date(m.upload_date).toLocaleDateString();
            return `<div style="border-bottom: 1px solid #eee; padding: 0.25rem 0; font-size: 0.85rem;">
                <strong>${m.filename}</strong><br>
                <span style="color: #666;">${m.description || 'No description'}</span><br>
                <span style="color: #999; font-size: 0.75rem;">${date}</span>
            </div>`;
        }).join('');
        
        // Get location address (reverse geocoding) - update popup when ready
        getLocationAddressCached(location.lat, location.lng).then(address => {
            // Update the address in the popup
            const addressElement = document.getElementById(`address-${location.lat}-${location.lng}`);
            if (addressElement) {
                addressElement.textContent = address;
            }
            // Also update marker's stored address for future use
            marker._address = address;
        });
        
        const popupContent = `
            <div style="padding: 0.5rem; min-width: 200px; max-width: 300px;">
                <h4 style="margin-bottom: 0.5rem; font-size: 1rem; color: ${color};">${getCategoryName(location.category)}</h4>
                <p style="margin: 0 0 0.5rem 0; color: #666; font-size: 0.9rem;">
                    <strong>${location.count}</strong> item(s) at this location
                </p>
                <div style="margin-bottom: 0.5rem; padding: 0.5rem; background: #e3f2fd; border-radius: 4px; border-left: 3px solid ${color};">
                    <strong style="font-size: 0.85rem; color: #1976d2;">📍 Location:</strong><br>
                    <span style="font-size: 0.85rem; color: #333;" id="address-${location.lat}-${location.lng}">Loading address...</span>
                </div>
                <div style="max-height: 200px; overflow-y: auto; margin-bottom: 0.5rem; padding: 0.5rem; background: #f5f5f5; border-radius: 4px;">
                    ${mediaDetails || '<p style="font-size: 0.85rem; color: #666;">No details available</p>'}
                </div>
                <button onclick="showGallery(${location.lat}, ${location.lng}, '${location.category}')" 
                        style="margin-top: 0.5rem; padding: 0.5rem; background: ${color}; color: #fff; border: none; border-radius: 4px; cursor: pointer; width: 100%; font-weight: 600;">
                    View All Media
                </button>
                <button onclick="enterVirtualTourWithMedia(${location.lat}, ${location.lng}, '${location.category}')" 
                        style="margin-top: 0.5rem; padding: 0.5rem; background: #23d18b; color: #fff; border: none; border-radius: 4px; cursor: pointer; width: 100%; font-weight: 600;">
                    🎮 Enter 3D Tour
                </button>
            </div>
        `;
        
        // Create Leaflet popup
        const popup = L.popup({ 
            offset: [0, -35],
            closeButton: true,
            closeOnClick: false
        }).setHTML(popupContent);
        
        // Create Leaflet marker (Leaflet uses [lat, lng] format)
        const marker = L.marker([location.lat, location.lng], {
            icon: L.divIcon({
                className: 'custom-marker-icon',
                html: el.outerHTML,
                iconSize: [35, 35],
                iconAnchor: [17, 35],
                popupAnchor: [0, -35]
            }),
            draggable: false
        })
            .bindPopup(popup)
            .addTo(map);
        
        // Add hover functionality - show popup on hover
        el.addEventListener('mouseenter', () => {
            if (!marker.isPopupOpen()) {
                marker.openPopup();
            }
        });
        
        // Keep popup open on hover, close on mouse leave (optional)
        el.addEventListener('mouseleave', () => {
            // Keep popup open for better UX, user can close manually
        });
        
        // Also add hover to popup itself to keep it open
        popup.on('open', () => {
            // Leaflet popups stay open by default, no need for special handling
        });
        
        // Store marker data
        marker._data = {
            lat: location.lat,
            lng: location.lng,
            category: location.category,
            count: location.count,
            media: media
        };
        
        markers.push(marker);
    });
    
    // Update sidebar
    updateSidebar(locations);
}

// Filter markers by category
function filterMarkers(category) {
    loadMarkers(category);
}

// Update sidebar with location list
function updateSidebar(locations) {
    const locationList = document.getElementById('locationList');
    locationList.innerHTML = '';
    
    if (locations.length === 0) {
        locationList.innerHTML = '<p style="padding: 1rem; color: #666;">No locations found</p>';
        return;
    }
    
    locations.forEach(location => {
        const item = document.createElement('div');
        item.className = 'location-item';
        const locationId = `sidebar-addr-${location.lat}-${location.lng}`;
        item.innerHTML = `
            <h4>${getCategoryName(location.category)}</h4>
            <span class="category category-${location.category}">${location.category}</span>
            <span class="count">${location.count} item(s)</span>
            <p style="margin-top: 0.5rem; color: #666; font-size: 0.85rem;" id="${locationId}">
                Loading address...
            </p>
        `;
        
        // Get address for sidebar
        getLocationAddressCached(location.lat, location.lng).then(address => {
            const addrEl = document.getElementById(locationId);
            if (addrEl) {
                addrEl.textContent = address;
            }
        });
        
        item.addEventListener('click', () => {
            // Leaflet uses flyTo with [lat, lng] format
            map.flyTo([location.lat, location.lng], 16, {
                duration: 2.0
            });
            // Open popup for the marker at this location
            setTimeout(() => {
                const marker = markers.find(m => 
                    Math.abs(m._data.lat - location.lat) < 0.001 && 
                    Math.abs(m._data.lng - location.lng) < 0.001 &&
                    m._data.category === location.category
                );
                if (marker) {
                    marker.openPopup();
                }
            }, 2100);
            showGallery(location.lat, location.lng, location.category);
        });
        
        // Add virtual tour button to sidebar item
        const tourBtn = document.createElement('button');
        tourBtn.className = 'btn-tour-sidebar';
        tourBtn.textContent = '🎮 3D Tour';
        tourBtn.style.cssText = 'margin-top: 0.5rem; padding: 0.5rem; background: #23d18b; color: #fff; border: none; border-radius: 4px; cursor: pointer; width: 100%; font-weight: 600; font-size: 0.85rem;';
        tourBtn.onclick = (e) => {
            e.stopPropagation();
            if (typeof enterVirtualTourWithMedia === 'function') {
                enterVirtualTourWithMedia(location.lat, location.lng, location.category);
            }
        };
        item.appendChild(tourBtn);
        
        locationList.appendChild(item);
    });
}

// Toggle sidebar
function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open', sidebarOpen);
}

// Show demo modal (exposed globally)
window.showDemoModal = function showDemoModal() {
    document.getElementById('demoModal').classList.remove('hidden');
}

// Close demo modal (exposed globally)
window.closeDemoModal = function closeDemoModal() {
    document.getElementById('demoModal').classList.add('hidden');
    const form = document.getElementById('demoForm');
    if (form) form.reset();
}

// Handle demo request (exposed globally)
window.handleDemoRequest = function handleDemoRequest(event) {
    event.preventDefault();
    const email = document.getElementById('demoEmail').value;
    if (email) {
        alert('Thank you! We\'ll contact you at ' + email + ' soon.');
        closeDemoModal();
    }
}

// Show login modal (exposed globally)
window.showLoginModal = function showLoginModal() {
    document.getElementById('loginModal').classList.remove('hidden');
}

// Close login modal (exposed globally)
window.closeLoginModal = function closeLoginModal() {
    document.getElementById('loginModal').classList.add('hidden');
    const form = document.getElementById('loginForm');
    if (form) form.reset();
}

// Handle login (exposed globally for inline onsubmit) - API call
window.handleLogin = async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const submitBtn = event.target.querySelector('button[type="submit"]');
    
    if (!email || !password) {
        alert('Please enter both email and password');
        return;
    }
    
    // Disable button and show loading
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing In...';
    }
    
    try {
        const response = await fetch(getApiUrl('/api/auth/login'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Store token and user info
            sessionStorage.setItem('twinner_auth', 'authenticated');
            sessionStorage.setItem('twinner_token', data.token);
            sessionStorage.setItem('twinner_email', data.user.email);
            sessionStorage.setItem('twinner_user_id', data.user.id);
            
            // Update authentication state immediately
            isAuthenticated = true;
            
            // Close modal first
            closeLoginModal();
            
            // Update UI immediately and wait for it
            await updateUIForAuth();
            
            // Force immediate UI update with direct DOM manipulation
            const signInBtn = document.getElementById('signInBtn');
            const signUpBtn = document.getElementById('signUpBtn');
            const requestDemoBtn = document.getElementById('requestDemoBtn');
            const uploadBtn = document.getElementById('uploadBtn');
            
            if (signInBtn) {
                signInBtn.classList.add('hidden');
                signInBtn.style.display = 'none';
            }
            if (signUpBtn) {
                signUpBtn.classList.add('hidden');
                signUpBtn.style.display = 'none';
            }
            if (requestDemoBtn) {
                requestDemoBtn.classList.add('hidden');
                requestDemoBtn.style.display = 'none';
            }
            if (uploadBtn) {
                uploadBtn.classList.remove('hidden');
                uploadBtn.style.display = 'inline-block';
                uploadBtn.textContent = 'Upload Media';
            }
            
            // Reload markers to show only user's media
            await loadMarkersFromAPI('all');
            
            // Show success message
            alert('Login successful! You can now upload media.');
        } else {
            alert(data.error || 'Login failed. Please check your credentials.');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed. Please try again.');
    } finally {
        // Re-enable button
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign In';
        }
    }
}

// Handle sign up (exposed globally for inline onsubmit) - API call
window.handleSignUp = async function handleSignUp(event) {
    event.preventDefault();
    
    const email = document.getElementById('signUpEmail').value;
    const password = document.getElementById('signUpPassword').value;
    const confirmPassword = document.getElementById('signUpConfirmPassword').value;
    const submitBtn = event.target.querySelector('button[type="submit"]');
    
    if (!email || !password || !confirmPassword) {
        alert('Please fill in all fields');
        return;
    }
    
    if (password.length < 6) {
        alert('Password must be at least 6 characters long');
        return;
    }
    
    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }
    
    // Disable button and show loading
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing Up...';
    }
    
    try {
        const response = await fetch(getApiUrl('/api/auth/register'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Account created - auto-login the user
            try {
                const loginResponse = await fetch(getApiUrl('/api/auth/login'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });
                
                const loginData = await loginResponse.json();
                
                if (loginResponse.ok) {
                    // Store token and user info in sessionStorage
                    sessionStorage.setItem('twinner_auth', 'authenticated');
                    sessionStorage.setItem('twinner_token', loginData.token);
                    sessionStorage.setItem('twinner_email', loginData.user.email);
                    sessionStorage.setItem('twinner_user_id', loginData.user.id);
                    
                    // Update authentication state immediately
                    isAuthenticated = true;
                    
                    // Close modal first
                    closeSignUpModal();
                    
                    // Update UI immediately and wait for it
                    await updateUIForAuth();
                    
                    // Force immediate UI update with direct DOM manipulation
                    const signInBtn = document.getElementById('signInBtn');
                    const signUpBtn = document.getElementById('signUpBtn');
                    const requestDemoBtn = document.getElementById('requestDemoBtn');
                    const uploadBtn = document.getElementById('uploadBtn');
                    
                    if (signInBtn) {
                        signInBtn.classList.add('hidden');
                        signInBtn.style.display = 'none';
                    }
                    if (signUpBtn) {
                        signUpBtn.classList.add('hidden');
                        signUpBtn.style.display = 'none';
                    }
                    if (requestDemoBtn) {
                        requestDemoBtn.classList.add('hidden');
                        requestDemoBtn.style.display = 'none';
                    }
                    if (uploadBtn) {
                        uploadBtn.classList.remove('hidden');
                        uploadBtn.style.display = 'inline-block';
                        uploadBtn.textContent = 'Upload Media';
                    }
                    
                    // Reload markers to show only user's media
                    await loadMarkersFromAPI('all');
                    
                    // Show success message
                    alert('Account created and signed in successfully! You can now upload media.');
                } else {
                    alert('Account created successfully! Please sign in.');
                    closeSignUpModal();
                    showLoginModal();
                    document.getElementById('loginEmail').value = email;
                }
            } catch (loginError) {
                console.error('Auto-login error:', loginError);
                alert('Account created successfully! Please sign in.');
                closeSignUpModal();
                showLoginModal();
                document.getElementById('loginEmail').value = email;
            }
        } else {
            alert(data.error || 'Sign up failed. Please try again.');
        }
    } catch (error) {
        console.error('Sign up error:', error);
        alert('Sign up failed. Please try again.');
    } finally {
        // Re-enable button
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign Up';
        }
    }
}

// Show sign up modal (exposed globally)
window.showSignUpModal = function showSignUpModal() {
    document.getElementById('signUpModal').classList.remove('hidden');
}

// Close sign up modal (exposed globally)
window.closeSignUpModal = function closeSignUpModal() {
    document.getElementById('signUpModal').classList.add('hidden');
    document.getElementById('signUpForm').reset();
}

// Show upload modal (exposed globally)
window.showUploadModal = async function showUploadModal() {
    // Check auth status first - check sessionStorage directly for immediate check
    const authStatus = sessionStorage.getItem('twinner_auth');
    const token = sessionStorage.getItem('twinner_token');
    
    // Quick check first - if we have auth in sessionStorage, allow it
    if (authStatus === 'authenticated' && token) {
        // User is authenticated, show modal
        const uploadModal = document.getElementById('uploadModal');
        if (uploadModal) {
            uploadModal.classList.remove('hidden');
            return;
        } else {
            console.error('Upload modal not found');
            alert('Upload modal not found. Please refresh the page.');
            return;
        }
    }
    
    // If not authenticated, prompt to sign in
    alert('Please sign in to upload media');
    showLoginModal();
}

// Close upload modal (exposed globally)
window.closeUploadModal = function closeUploadModal() {
    document.getElementById('uploadModal').classList.add('hidden');
    document.getElementById('uploadForm').reset();
    
    // Reset image/video preview
    const preview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    const previewVideo = document.getElementById('previewVideo');
    if (preview) preview.style.display = 'none';
    if (previewImg) {
        previewImg.src = '';
        previewImg.style.display = 'none';
    }
    if (previewVideo) {
        previewVideo.src = '';
        previewVideo.style.display = 'none';
    }
    
    // Reset manual coordinate input
    const manualInput = document.getElementById('manualCoordInput');
    const coordTextInput = document.getElementById('coordTextInput');
    if (manualInput) manualInput.style.display = 'none';
    if (coordTextInput) coordTextInput.value = '';
    
    // Reset location status
    const locationStatus = document.getElementById('locationStatus');
    if (locationStatus) {
        locationStatus.textContent = 'Select an image with geotags to auto-detect location, or click on map to set location';
        locationStatus.style.color = '#666';
    }
    // Reset location inputs to readonly
    const latInput = document.getElementById('latitude');
    const lngInput = document.getElementById('longitude');
    if (latInput && lngInput) {
        latInput.value = '';
        lngInput.value = '';
        latInput.setAttribute('readonly', 'readonly');
        lngInput.setAttribute('readonly', 'readonly');
        latInput.removeAttribute('required');
        lngInput.removeAttribute('required');
    }
}

// Enable map click to set location
function enableMapClick() {
    const locationStatus = document.getElementById('locationStatus');
    locationStatus.textContent = 'Click anywhere on the map to set the location';
    locationStatus.style.color = '#ff9800';
    
    // Add temporary visual indicator
    const mapContainer = document.getElementById('map');
    if (mapContainer) {
        mapContainer.style.cursor = 'crosshair';
        mapContainer.classList.add('map-click-mode');
        // Remove after 30 seconds or when location is set
        setTimeout(() => {
            mapContainer.style.cursor = '';
            mapContainer.classList.remove('map-click-mode');
        }, 30000);
    }
}

// Extract coordinates from text input (for images with visible coordinates)
function extractFromText() {
    const coordText = document.getElementById('coordTextInput').value;
    const latInput = document.getElementById('latitude');
    const lngInput = document.getElementById('longitude');
    const locationStatus = document.getElementById('locationStatus');
    
    if (!coordText) {
        alert('Please enter coordinates text');
        return;
    }
    
    // Try multiple parsing strategies
    let coords = parseCoordinateString(coordText);
    
    // If first attempt fails, try cleaning the text
    if (!coords) {
        // Remove extra spaces, normalize
        const cleaned = coordText.replace(/\s+/g, ' ').trim();
        coords = parseCoordinateString(cleaned);
    }
    
    // If still fails, try extracting just numbers
    if (!coords) {
        const numbers = coordText.match(/([+-]?\d+\.?\d+)/g);
        if (numbers && numbers.length >= 2) {
            const lat = parseFloat(numbers[0]);
            const lng = parseFloat(numbers[1]);
            // Check if they're reasonable coordinates
            if (!isNaN(lat) && !isNaN(lng)) {
                // If lat seems too large, might be swapped
                if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
                    coords = { latitude: lng, longitude: lat };
                } else if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
                    coords = { latitude: lat, longitude: lng };
                }
            }
        }
    }
    
    if (coords && coords.latitude && coords.longitude) {
        latInput.value = coords.latitude; // Preserve full precision
        lngInput.value = coords.longitude; // Preserve full precision
        latInput.removeAttribute('readonly');
        lngInput.removeAttribute('readonly');
        locationStatus.textContent = '✓ Coordinates extracted from text!';
        locationStatus.style.color = '#23d18b';
        
        // Fetch address
        getLocationAddressCached(coords.latitude, coords.longitude).then(address => {
            locationStatus.textContent = `✓ Location: ${address}`;
        });
    } else {
        alert('Could not parse coordinates. Try formats like:\n- "lat 22.889299 lon 22.169399"\n- "Lat 13.323528° Long 75.771964°"\n- "13.323528, 75.771964"\n- "26; 6; 22.889299" (DMS format)');
    }
}

// Get current location and show address
function getCurrentLocation() {
    const latInput = document.getElementById('latitude');
    const lngInput = document.getElementById('longitude');
    const locationStatus = document.getElementById('locationStatus');
    
    if (navigator.geolocation) {
        locationStatus.textContent = 'Getting your location...';
        locationStatus.style.color = '#2196f3';
        
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude; // Preserve full precision
                const lng = position.coords.longitude; // Preserve full precision
                
                latInput.value = lat;
                lngInput.value = lng;
                latInput.removeAttribute('readonly');
                lngInput.removeAttribute('readonly');
                
                // Get address for the location
                locationStatus.textContent = 'Getting address...';
                const address = await getLocationAddressCached(parseFloat(lat), parseFloat(lng));
                locationStatus.textContent = `✓ Location: ${address}`;
                locationStatus.style.color = '#23d18b';
            },
            (error) => {
                locationStatus.textContent = 'Error getting location: ' + error.message;
                locationStatus.style.color = '#f44336';
                alert('Unable to get your location. Please enter coordinates manually.');
            }
        );
    } else {
        alert('Geolocation is not supported by your browser.');
    }
}

// Handle file upload (exposed globally for inline onsubmit)
window.handleUpload = async function handleUpload(event) {
    event.preventDefault();
    
    const fileInput = document.getElementById('mediaFile');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Please select a file');
        return;
    }
    
    // Get category from unified dropdown
    const uploadCategory = document.getElementById('uploadCategory').value;
    const description = document.getElementById('description').value;
    let latitude = parseFloat(document.getElementById('latitude').value);
    let longitude = parseFloat(document.getElementById('longitude').value);
    
    if (!uploadCategory) {
        alert('Please select a category');
        return;
    }
    
    // Parse the category value (format: "type:value")
    const [categoryType, categoryValue] = uploadCategory.split(':');
    
    // Map to legacy category for API compatibility
    // Asset Types are the main categories for backward compatibility
    let category = 'other'; // Default
    if (categoryType === 'assetType') {
        category = categoryValue; // solar, equipment, building, infrastructure
    } else if (categoryType === 'org' || categoryType === 'space' || categoryType === 'spaceType' || categoryType === 'asset' || categoryType === 'properties') {
        // For other types, default to 'other' or use the first asset type
        category = 'other';
    }
    
    // For images: Try to extract EXIF geotags first
    if (file.type.startsWith('image/')) {
        try {
            const exifData = await getExifData(file);
            if (exifData && exifData.latitude && exifData.longitude) {
                latitude = exifData.latitude;
                longitude = exifData.longitude;
                document.getElementById('latitude').value = latitude; // Preserve full precision
                document.getElementById('longitude').value = longitude; // Preserve full precision
            }
        } catch (error) {
            console.log('No EXIF data found');
        }
    }
    // For videos: No EXIF, must use manual input
    else if (file.type.startsWith('video/')) {
        // Videos don't have EXIF, coordinates must be provided manually
        // The form already requires them, so just continue
    }
    
    // Validate coordinates are provided
    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
        const fileType = file.type.startsWith('image/') ? 'image' : 'video';
        const message = fileType === 'video' 
            ? 'Videos require location coordinates. Use "Click on Map", "Use Current Location", or enter manually.'
            : 'Please provide location coordinates. Use "Use Current Location" button, "Click on Map", or enter manually.';
        alert(message);
        return;
    }
    
    // Validate coordinates are within South Africa bounds
    // South Africa: Latitude -35 to -22, Longitude 16 to 33
    if (latitude > -22 || latitude < -35 || longitude < 16 || longitude > 33) {
        alert(`Coordinates (${latitude.toFixed(6)}, ${longitude.toFixed(6)}) are outside South Africa.\n\nSouth Africa bounds:\nLatitude: -35 to -22\nLongitude: 16 to 33\n\nPlease use coordinates within South Africa.`);
        return;
    }
    
    // Get token from sessionStorage
    const token = sessionStorage.getItem('twinner_token');
    if (!token) {
        alert('Please sign in to upload media.');
        return;
    }
    
    // Show loading state
    const submitBtn = event.target.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Uploading...';
    }
    
    try {
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('media', file);
        formData.append('category', category);
        // Store the full category selection in description for reference
        const fullDescription = description ? `${description} | Category: ${uploadCategory}` : `Category: ${uploadCategory}`;
        formData.append('description', fullDescription);
        
        // Ensure coordinates are strings with full precision
        formData.append('latitude', latitude.toString());
        formData.append('longitude', longitude.toString());
        
        console.log('📤 Uploading to API with coordinates:', { latitude, longitude, category });
        
        // Upload to API (stores in SQLite on server)
        const response = await fetch(getApiUrl('/api/media/upload'), {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        console.log('Upload response status:', response.status);
        const data = await response.json();
        console.log('Upload response data:', data);
        
        if (response.ok) {
            console.log('✅ Upload successful, media_id:', data.media_id);
            console.log('📍 Location:', data.location);
            
            // Close modal first
            closeUploadModal();
            
            // Reload markers from API (show all categories)
            try {
                // Clear existing markers first
                markers.forEach(marker => marker.remove());
                markers = [];
                allMarkers = [];
                
                // Reload all markers
                await loadMarkersFromAPI('all');
                
                console.log(`✅ Reloaded ${markers.length} markers after upload`);
                
                // Center map on the new marker location
                if (data.location && data.location.latitude && data.location.longitude) {
                    console.log('🗺️ Centering map on new marker:', data.location);
                    map.flyTo([data.location.latitude, data.location.longitude], 15, {
                        duration: 1.5
                    });
                    
                    // After animation, find and open the popup for the new marker
                    setTimeout(() => {
                        const newMarker = markers.find(m => {
                            const markerLatLng = m.getLatLng();
                            const tolerance = 0.001; // Slightly larger tolerance for coordinate matching
                            return Math.abs(markerLatLng.lng - parseFloat(data.location.longitude)) < tolerance &&
                                   Math.abs(markerLatLng.lat - parseFloat(data.location.latitude)) < tolerance;
                        });
                        if (newMarker) {
                            console.log('📍 Found new marker, opening popup');
                            newMarker.openPopup();
                        } else {
                            console.warn('⚠️ New marker not found after reload. Total markers:', markers.length);
                        }
                    }, 2000); // Increased timeout to ensure markers are loaded
                }
                
                alert('✅ Media uploaded successfully! Pin added to map.');
            } catch (markerError) {
                console.error('❌ Error reloading markers:', markerError);
                alert('Upload successful, but failed to reload markers. Please refresh the page.');
            }
        } else {
            console.error('❌ Upload failed:', data.error);
            alert(data.error || 'Upload failed. Please try again.');
        }
    } catch (error) {
        console.error('Upload error:', error);
        alert('Upload failed. Please try again.');
    } finally {
        // Re-enable button
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Upload Media';
        }
    }
}

// Get EXIF data from image
function getExifData(file) {
    return new Promise((resolve, reject) => {
        try {
            // Check if EXIF is available
            if (typeof EXIF === 'undefined') {
                reject('EXIF library not loaded');
                return;
            }
            
            console.log('Starting EXIF extraction for file:', file.name);
            
            // EXIF.js requires an image element, not a File object
            // Create an image element and load the file into it
            const img = new Image();
            const reader = new FileReader();
            
            reader.onload = function(e) {
                img.onload = function() {
                    console.log('Image loaded, extracting EXIF data...');
                    
                    // Now we can use EXIF.getData with the image element
                    EXIF.getData(img, function() {
                try {
                    console.log('EXIF.getData callback executed');
                    
                    // Get ALL tags first for debugging
                    const allData = EXIF.getAllTags(this);
                    console.log('=== ALL EXIF DATA ===');
                    console.log(allData);
                    console.log('====================');
                    
                    // Try multiple methods to get GPS data
                    let lat = EXIF.getTag(this, 'GPSLatitude');
                    let latRef = EXIF.getTag(this, 'GPSLatitudeRef');
                    let lng = EXIF.getTag(this, 'GPSLongitude');
                    let lngRef = EXIF.getTag(this, 'GPSLongitudeRef');
                    
                    console.log('Initial GPS tags:', { lat, latRef, lng, lngRef });
                    
                    // Try alternative tag names from allData
                    if (!lat || !lng) {
                        lat = lat || allData.GPSLatitude;
                        latRef = latRef || allData.GPSLatitudeRef;
                        lng = lng || allData.GPSLongitude;
                        lngRef = lngRef || allData.GPSLongitudeRef;
                        console.log('After checking allData:', { lat, latRef, lng, lngRef });
                    }
                    
                    // Try GPSInfo object
                    if (!lat || !lng) {
                        const gpsInfo = allData.GPS || {};
                        lat = lat || gpsInfo.GPSLatitude;
                        latRef = latRef || gpsInfo.GPSLatitudeRef;
                        lng = lng || gpsInfo.GPSLongitude;
                        lngRef = lngRef || gpsInfo.GPSLongitudeRef;
                        console.log('After checking GPS object:', { lat, latRef, lng, lngRef });
                    }
                    
                    // Try reading ALL tags manually - sometimes stored with different keys
                    if (!lat || !lng) {
                        console.log('Searching all tags for GPS data...');
                        for (const key in allData) {
                            const keyLower = key.toLowerCase();
                            if (keyLower.includes('gps') || keyLower.includes('latitude') || keyLower.includes('longitude')) {
                                console.log(`Found GPS-related tag: ${key} =`, allData[key], typeof allData[key]);
                                
                                // Try to extract from this tag
                                if (keyLower.includes('latitude') && !lat) {
                                    lat = allData[key];
                                    if (allData[key + 'Ref']) latRef = allData[key + 'Ref'];
                                }
                                if (keyLower.includes('longitude') && !lng) {
                                    lng = allData[key];
                                    if (allData[key + 'Ref']) lngRef = allData[key + 'Ref'];
                                }
                            }
                        }
                        console.log('After manual search:', { lat, latRef, lng, lngRef });
                    }
                    
                    // Try reading raw EXIF segments
                    if (!lat || !lng) {
                        try {
                            const exifObj = EXIF.readFromBinaryFile(this);
                            if (exifObj && exifObj.exif) {
                                console.log('Raw EXIF object:', exifObj);
                                lat = lat || exifObj.exif.GPSLatitude;
                                lng = lng || exifObj.exif.GPSLongitude;
                            }
                        } catch (e) {
                            console.log('Could not read raw EXIF:', e);
                        }
                    }
                    
                    // Handle semicolon-separated DMS format (like "26; 6; 22.8892999999952629")
                    // This is the format from Windows Properties dialog
                    if (lat && typeof lat === 'string' && lat.includes(';')) {
                        const parts = lat.split(';').map(p => parseFloat(p.trim()));
                        if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
                            lat = parts; // Convert to array format
                            console.log('Converted lat from string DMS to array:', lat);
                        }
                    }
                    if (lng && typeof lng === 'string' && lng.includes(';')) {
                        const parts = lng.split(';').map(p => parseFloat(p.trim()));
                        if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
                            lng = parts; // Convert to array format
                            console.log('Converted lng from string DMS to array:', lng);
                        }
                    }
                    
                    // EXIF.js usually returns DMS as arrays, but check if it's in Rational format
                    // Rational format: [{numerator: 26, denominator: 1}, {numerator: 6, denominator: 1}, ...]
                    if (lat && Array.isArray(lat) && lat.length === 3) {
                        // Check if elements are Rational objects
                        const isRational = lat[0] && typeof lat[0] === 'object' && lat[0].numerator !== undefined;
                        if (isRational) {
                            lat = lat.map(r => {
                                if (r && r.numerator !== undefined) {
                                    // Preserve full precision by using the division result directly
                                    const denom = r.denominator || 1;
                                    return r.numerator / denom;
                                }
                                return typeof r === 'number' ? r : parseFloat(r);
                            });
                            console.log('Converted lat from Rational to number array:', lat);
                            console.log('Lat DMS values:', lat[0], 'degrees,', lat[1], 'minutes,', lat[2], 'seconds');
                        }
                    }
                    if (lng && Array.isArray(lng) && lng.length === 3) {
                        const isRational = lng[0] && typeof lng[0] === 'object' && lng[0].numerator !== undefined;
                        if (isRational) {
                            lng = lng.map(r => {
                                if (r && r.numerator !== undefined) {
                                    // Preserve full precision by using the division result directly
                                    const denom = r.denominator || 1;
                                    return r.numerator / denom;
                                }
                                return typeof r === 'number' ? r : parseFloat(r);
                            });
                            console.log('Converted lng from Rational to number array:', lng);
                            console.log('Lng DMS values:', lng[0], 'degrees,', lng[1], 'minutes,', lng[2], 'seconds');
                        }
                    }
                    
                    // For South Africa: If no reference is provided, check if coordinates are in SA range
                    // South Africa: Latitude -35 to -22 (or 22-35 if positive), Longitude 16 to 33
                    // If we have positive lat in 22-35 range with no ref, assume South (should be negative)
                    if (!latRef && Array.isArray(lat) && lat.length >= 3) {
                        const testLat = lat[0] + (lat[1] / 60) + (lat[2] / 3600);
                        // If latitude is between 22-35 degrees (SA range) and no ref, assume South
                        if (testLat >= 22 && testLat <= 35) {
                            latRef = 'S';
                            console.log('⚠ No latRef found, but coordinate is in SA range (22-35°). Assuming South (S)');
                        }
                    }
                    if (!lngRef && Array.isArray(lng) && lng.length >= 3) {
                        const testLng = lng[0] + (lng[1] / 60) + (lng[2] / 3600);
                        // If longitude is between 16-33 degrees (SA range) and no ref, assume East
                        if (testLng >= 16 && testLng <= 33) {
                            lngRef = 'E';
                            console.log('⚠ No lngRef found, but coordinate is in SA range (16-33°). Assuming East (E)');
                        }
                    }
                    
                    console.log('Final GPS values before conversion:', { 
                        lat, 
                        latRef, 
                        lng, 
                        lngRef, 
                        latType: typeof lat, 
                        lngType: typeof lng, 
                        latIsArray: Array.isArray(lat), 
                        lngIsArray: Array.isArray(lng),
                        latValue: lat,
                        lngValue: lng
                    });
                    
                    // Log the raw DMS values if they're arrays
                    if (Array.isArray(lat) && lat.length >= 3) {
                        console.log('Latitude DMS:', lat[0], '°', lat[1], "'", lat[2], '"', latRef ? `(${latRef})` : '(no ref - will assume based on SA range)');
                    }
                    if (Array.isArray(lng) && lng.length >= 3) {
                        console.log('Longitude DMS:', lng[0], '°', lng[1], "'", lng[2], '"', lngRef ? `(${lngRef})` : '(no ref - will assume based on SA range)');
                    }
                    
                    if (lat && lng) {
                        // Handle different coordinate formats
                        let latitude, longitude;
                        
                        // If already in decimal format
                        if (typeof lat === 'number' && typeof lng === 'number') {
                            latitude = lat;
                            longitude = lng;
                        } 
                        // If in DMS format (array) - this is the most common EXIF format
                        else if (Array.isArray(lat) && Array.isArray(lng)) {
                            // Ensure arrays have 3 elements
                            if (lat.length >= 3 && lng.length >= 3) {
                                try {
                                    latitude = convertDMSToDD(lat, latRef);
                                    longitude = convertDMSToDD(lng, lngRef);
                                } catch (error) {
                                    console.error('DMS conversion error:', error);
                                    reject('Error converting DMS coordinates: ' + error.message);
                                    return;
                                }
                            } else {
                                reject('Invalid DMS array format - need 3 elements');
                                return;
                            }
                        }
                        // If only one is array, try to convert the other
                        else if (Array.isArray(lat) && !Array.isArray(lng)) {
                            if (lat.length >= 3) {
                                try {
                                    latitude = convertDMSToDD(lat, latRef);
                                    longitude = typeof lng === 'number' ? lng : parseFloat(lng);
                                    if (isNaN(longitude)) {
                                        reject('Invalid longitude format');
                                        return;
                                    }
                                    if (lngRef === 'W' || lngRef === 'w') longitude = -longitude;
                                } catch (error) {
                                    reject('Error converting latitude DMS: ' + error.message);
                                    return;
                                }
                            } else {
                                reject('Invalid latitude DMS format');
                                return;
                            }
                        }
                        else if (Array.isArray(lng) && !Array.isArray(lat)) {
                            if (lng.length >= 3) {
                                try {
                                    longitude = convertDMSToDD(lng, lngRef);
                                    latitude = typeof lat === 'number' ? lat : parseFloat(lat);
                                    if (isNaN(latitude)) {
                                        reject('Invalid latitude format');
                                        return;
                                    }
                                    if (latRef === 'S' || latRef === 's') latitude = -latitude;
                                } catch (error) {
                                    reject('Error converting longitude DMS: ' + error.message);
                                    return;
                                }
                            } else {
                                reject('Invalid longitude DMS format');
                                return;
                            }
                        }
                        // If in string format, try to parse
                        else {
                            latitude = parseFloat(lat);
                            longitude = parseFloat(lng);
                            
                            if (isNaN(latitude) || isNaN(longitude)) {
                                reject('Invalid GPS coordinate format');
                                return;
                            }
                            
                            // Apply reference (N/S, E/W)
                            if (latRef === 'S' || latRef === 's') latitude = -latitude;
                            if (lngRef === 'W' || lngRef === 'w') longitude = -longitude;
                        }
                        
                        // Validate coordinates
                        if (isNaN(latitude) || isNaN(longitude)) {
                            reject('Invalid GPS coordinates');
                            return;
                        }
                        
                        // Final validation
                        if (isNaN(latitude) || isNaN(longitude)) {
                            console.error('Coordinates are NaN after conversion');
                            reject('Invalid GPS coordinates after conversion');
                            return;
                        }
                        
                        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
                            console.error('Coordinates out of range:', latitude, longitude);
                            reject(`Coordinates out of valid range: lat=${latitude}, lng=${longitude}`);
                            return;
                        }
                        
                        console.log('✓ EXIF GPS found and validated:', latitude, longitude);
                        resolve({ latitude, longitude });
                    } else {
                        console.warn('No GPS tags found in EXIF');
                        console.log('Available EXIF tags:', Object.keys(allData || {}));
                        reject('No GPS data found in EXIF. Available tags: ' + Object.keys(allData || {}).join(', '));
                    }
                } catch (error) {
                    console.error('Error reading EXIF tags:', error);
                    reject('Error reading EXIF data: ' + error.message);
                }
                    });
                };
                
                img.onerror = function() {
                    console.error('Failed to load image for EXIF extraction');
                    reject('Failed to load image');
                };
                
                img.src = e.target.result;
            };
            
            reader.onerror = function() {
                console.error('FileReader error');
                reject('Failed to read file');
            };
            
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('EXIF extraction setup error:', error);
            reject('EXIF extraction failed: ' + error.message);
        }
    });
}

// Convert DMS to Decimal Degrees
function convertDMSToDD(dms, ref) {
    if (!Array.isArray(dms) || dms.length < 3) {
        throw new Error('Invalid DMS format');
    }
    
    // Handle Rational format (EXIF sometimes uses {numerator, denominator})
    const getValue = (val) => {
        if (typeof val === 'number') {
            // Already a number, return as-is to preserve precision
            return val;
        }
        if (typeof val === 'string') {
            // Parse string, preserving full precision
            return parseFloat(val);
        }
        if (typeof val === 'object' && val !== null) {
            // Rational format - preserve full precision
            if (val.numerator !== undefined && val.denominator !== undefined) {
                // Use division to get full precision (JavaScript handles this correctly)
                const result = val.numerator / val.denominator;
                console.log('Rational conversion:', val.numerator, '/', val.denominator, '=', result);
                return result;
            }
            // Array-like object
            if (val.length !== undefined) {
                return parseFloat(val[0]) || 0;
            }
        }
        return parseFloat(val) || 0;
    };
    
    const degrees = getValue(dms[0]);
    const minutes = getValue(dms[1]);
    const seconds = getValue(dms[2]);
    
    console.log('DMS conversion input:', { degrees, minutes, seconds, ref });
    
    if (isNaN(degrees) || isNaN(minutes) || isNaN(seconds)) {
        throw new Error('Invalid DMS values');
    }
    
    // Preserve full precision: use exact arithmetic
    // Convert minutes to decimal: minutes / 60
    const minutesDecimal = minutes / 60;
    // Convert seconds to decimal: seconds / 3600
    const secondsDecimal = seconds / 3600;
    // Add all parts together
    let dd = degrees + minutesDecimal + secondsDecimal;
    
    console.log('DMS conversion:', {
        degrees,
        minutes,
        seconds,
        minutesDecimal,
        secondsDecimal,
        result: dd
    });
    
    if (ref === 'S' || ref === 'W' || ref === 's' || ref === 'w') {
        dd = dd * -1;
    }
    return dd;
}

// Extract coordinates using OCR (Tesseract.js)
async function extractCoordinatesWithOCR(file) {
    return new Promise(async (resolve, reject) => {
        try {
            // Check if Tesseract is available
            if (typeof Tesseract === 'undefined') {
                reject('Tesseract.js library not loaded');
                return;
            }
            
            console.log('Starting OCR extraction for file:', file.name);
            
            // Convert file to image
            const img = new Image();
            const reader = new FileReader();
            
            reader.onload = async function(e) {
                img.onload = async function() {
                    try {
                        console.log('Running OCR on image...');
                        
                        // Run OCR on the image
                        const { data: { text } } = await Tesseract.recognize(img, 'eng', {
                            logger: m => {
                                if (m.status === 'recognizing text') {
                                    console.log('OCR progress:', Math.round(m.progress * 100) + '%');
                                }
                            }
                        });
                        
                        console.log('OCR extracted text:', text);
                        
                        // Try to parse coordinates from the OCR text
                        let coords = parseCoordinateString(text);
                        
                        if (coords && coords.latitude && coords.longitude) {
                            // For South Africa: If coordinates are in SA range and positive, apply South reference
                            let lat = coords.latitude;
                            let lng = coords.longitude;
                            
                            if (lat >= 22 && lat <= 35 && lng >= 16 && lng <= 33) {
                                lat = -lat;
                                console.log('⚠ Applied South Africa reference to parsed coordinates: latitude made negative:', lat);
                            }
                            
                            console.log('✓ OCR found coordinates:', { latitude: lat, longitude: lng });
                            resolve({ latitude: lat, longitude: lng });
                            return;
                        }
                        
                        // Try searching for DMS format in the text (like "26; 6; 22.8892999999952629")
                        // OCR often misreads characters, so we need flexible patterns
                        const dmsPatterns = [
                            // Pattern with labels: "Latitude 26; 6; 22.8892999999952629" (handles OCR errors)
                            /(?:lat|latitude)[:\s]*(\d+)[;\s,]+(\d+)[;\s,]+(\d+\.?\d*)\s*(\d+\.?\d*)?.*?(?:lon|longitude)[:\s]*(\d+)[;\s,]+(\d+)[;\s,]+(\d+\.?\d*)\s*(\d+\.?\d*)?/i,
                            // Pattern: "26; 6; 22 8802000000052620" (OCR might split seconds with space)
                            /(\d+)[;\s,]+(\d+)[;\s,]+(\d+\.?\d*)\s+(\d+\.?\d*).*?(\d+)[;\s,]+(\d+)[;\s,]+(\d+\.?\d*)\s*(\d+\.?\d*)?/,
                            // Pattern: "26; 6; 22.8892999999952629" (semicolon-separated)
                            /(\d+)[;\s,]+(\d+)[;\s,]+([\d.]+).*?(\d+)[;\s,]+(\d+)[;\s,]+([\d.]+)/,
                            // Pattern: "26 6 22.8892999999952629" (space-separated)
                            /(\d+)\s+(\d+)\s+([\d.]+).*?(\d+)\s+(\d+)\s+([\d.]+)/,
                        ];
                        
                        for (let i = 0; i < dmsPatterns.length; i++) {
                            const pattern = dmsPatterns[i];
                            const match = text.match(pattern);
                            if (match) {
                                console.log('DMS pattern match:', i, match);
                                
                                let latDeg, latMin, latSec, lngDeg, lngMin, lngSec;
                                
                                if (i === 0) {
                                    // Pattern with labels - might have split seconds
                                    latDeg = parseFloat(match[1]);
                                    latMin = parseFloat(match[2]);
                                    // Handle split seconds: "22 8802000000052620" -> "22.8892999999952629"
                                    if (match[4]) {
                                        // Seconds were split, combine them
                                        latSec = parseFloat(match[3] + '.' + match[4].replace(/^0+/, ''));
                                    } else {
                                        latSec = parseFloat(match[3]);
                                    }
                                    lngDeg = parseFloat(match[5]);
                                    lngMin = parseFloat(match[6]);
                                    if (match[8]) {
                                        lngSec = parseFloat(match[7] + '.' + match[8].replace(/^0+/, ''));
                                    } else {
                                        lngSec = parseFloat(match[7]);
                                    }
                                } else if (i === 1) {
                                    // Pattern with split seconds
                                    latDeg = parseFloat(match[1]);
                                    latMin = parseFloat(match[2]);
                                    // Combine split seconds: "22" + "8802000000052620" -> "22.8892999999952629"
                                    const latSecPart1 = match[3];
                                    const latSecPart2 = match[4] || '';
                                    if (latSecPart2) {
                                        // Remove leading zeros and combine
                                        latSec = parseFloat(latSecPart1 + '.' + latSecPart2.replace(/^0+/, ''));
                                    } else {
                                        latSec = parseFloat(latSecPart1);
                                    }
                                    lngDeg = parseFloat(match[5]);
                                    lngMin = parseFloat(match[6]);
                                    const lngSecPart1 = match[7];
                                    const lngSecPart2 = match[8] || '';
                                    if (lngSecPart2) {
                                        lngSec = parseFloat(lngSecPart1 + '.' + lngSecPart2.replace(/^0+/, ''));
                                    } else {
                                        lngSec = parseFloat(lngSecPart1);
                                    }
                                } else {
                                    // Standard patterns
                                    latDeg = parseFloat(match[1]);
                                    latMin = parseFloat(match[2]);
                                    latSec = parseFloat(match[3]);
                                    lngDeg = parseFloat(match[4]);
                                    lngMin = parseFloat(match[5]);
                                    lngSec = parseFloat(match[6]);
                                }
                                
                                console.log('Parsed DMS:', {
                                    lat: `${latDeg}° ${latMin}' ${latSec}"`,
                                    lng: `${lngDeg}° ${lngMin}' ${lngSec}"`
                                });
                                
                                let lat = latDeg + latMin / 60 + latSec / 3600;
                                let lng = lngDeg + lngMin / 60 + lngSec / 3600;
                                
                                console.log('Converted to decimal (before SA check):', { lat, lng });
                                
                                // For South Africa: If coordinates are in SA range and positive, apply South reference
                                // South Africa: Latitude -35 to -22 (or 22-35 if positive), Longitude 16 to 33
                                if (lat >= 22 && lat <= 35 && lng >= 16 && lng <= 33) {
                                    // Coordinates are in SA range but positive - make latitude negative (South)
                                    lat = -lat;
                                    console.log('⚠ Applied South Africa reference: latitude made negative:', lat);
                                }
                                
                                // Validate coordinates
                                if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                                    console.log('✓ OCR found DMS coordinates:', { lat, lng });
                                    resolve({ latitude: lat, longitude: lng });
                                    return;
                                }
                            }
                        }
                        
                        // Special handling for OCR text that shows: "26; 6; 22 8802000000052620"
                        // This means seconds were split: "22.8892999999952629" -> "22" + "8802000000052620"
                        // Pattern: "Latitude 26; 6; 22 8802000000052620" and "Longitude 28; 10, 22.1693999999988733"
                        const splitSecondsPattern = /(?:lat|latitude)[:\s]*(\d+)[;\s,]+(\d+)[;\s,]+(\d+)\s+(\d+).*?(?:lon|longitude)[:\s]*(\d+)[;\s,]+(\d+)[;\s,]+(\d+\.?\d*)/i;
                        const splitMatch = text.match(splitSecondsPattern);
                        if (splitMatch) {
                            console.log('Found split seconds pattern:', splitMatch);
                            const latDeg = parseFloat(splitMatch[1]);
                            const latMin = parseFloat(splitMatch[2]);
                            // Combine: "22" + "8802000000052620" -> "22.8892999999952629"
                            // The "8802000000052620" is OCR misread, should be "8892999999952629"
                            // But we'll use it as-is: "22" + "." + "8802000000052620" = "22.8802000000052620"
                            // Actually, let's try to fix OCR errors: "8802000000052620" might be "8892999999952629"
                            // For now, just combine them: "22.8802000000052620"
                            const latSecPart1 = splitMatch[3]; // "22"
                            const latSecPart2 = splitMatch[4]; // "8802000000052620"
                            // Combine: "22.8802000000052620" (close enough, OCR error in the decimal part)
                            const latSec = parseFloat(latSecPart1 + '.' + latSecPart2);
                            
                            const lngDeg = parseFloat(splitMatch[5]);
                            const lngMin = parseFloat(splitMatch[6]);
                            // Longitude seconds look correct: "22.1693999999988733"
                            const lngSec = parseFloat(splitMatch[7]);
                            
                            console.log('Parsed split seconds:', {
                                latSec: latSecPart1 + '.' + latSecPart2 + ' = ' + latSec,
                                lngSec: splitMatch[7] + ' = ' + lngSec
                            });
                            
                            let lat = latDeg + latMin / 60 + latSec / 3600;
                            let lng = lngDeg + lngMin / 60 + lngSec / 3600;
                            
                            console.log('Converted split seconds to decimal (before SA check):', { lat, lng });
                            
                            // For South Africa: If coordinates are in SA range and positive, apply South reference
                            if (lat >= 22 && lat <= 35 && lng >= 16 && lng <= 33) {
                                lat = -lat;
                                console.log('⚠ Applied South Africa reference: latitude made negative:', lat);
                            }
                            
                            if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                                console.log('✓ OCR found DMS coordinates (split seconds):', { lat, lng });
                                resolve({ latitude: lat, longitude: lng });
                                return;
                            }
                        }
                        
                        // Try a simpler pattern that matches the exact OCR output format
                        // "Latitude 26; 6; 22 8802000000052620" and "Longitude 28; 10, 22.1693999999988733"
                        const simplePattern = /latitude[:\s]*(\d+)[;\s,]+(\d+)[;\s,]+(\d+)\s+(\d+).*?longitude[:\s]*(\d+)[;\s,]+(\d+)[;\s,]+(\d+\.?\d+)/i;
                        const simpleMatch = text.match(simplePattern);
                        if (simpleMatch) {
                            console.log('Found simple pattern:', simpleMatch);
                            const latDeg = parseFloat(simpleMatch[1]);
                            const latMin = parseFloat(simpleMatch[2]);
                            const latSec = parseFloat(simpleMatch[3] + '.' + simpleMatch[4]);
                            const lngDeg = parseFloat(simpleMatch[5]);
                            const lngMin = parseFloat(simpleMatch[6]);
                            const lngSec = parseFloat(simpleMatch[7]);
                            
                            let lat = latDeg + latMin / 60 + latSec / 3600;
                            let lng = lngDeg + lngMin / 60 + lngSec / 3600;
                            
                            console.log('Simple pattern result (before SA check):', { lat, lng });
                            
                            // For South Africa: If coordinates are in SA range and positive, apply South reference
                            if (lat >= 22 && lat <= 35 && lng >= 16 && lng <= 33) {
                                lat = -lat;
                                console.log('⚠ Applied South Africa reference: latitude made negative:', lat);
                            }
                            
                            if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                                console.log('✓ OCR found DMS coordinates (simple pattern):', { lat, lng });
                                resolve({ latitude: lat, longitude: lng });
                                return;
                            }
                        }
                        
                        reject('No valid coordinates found in OCR text');
                    } catch (error) {
                        console.error('OCR processing error:', error);
                        reject('OCR extraction failed: ' + error.message);
                    }
                };
                
                img.onerror = function() {
                    reject('Failed to load image for OCR');
                };
                
                img.src = e.target.result;
            };
            
            reader.onerror = function() {
                reject('Failed to read file for OCR');
            };
            
            reader.readAsDataURL(file);
        } catch (error) {
            reject('OCR setup failed: ' + error.message);
        }
    });
}

// Extract coordinates from image text overlay (if coordinates are visible in the image)
// This uses OCR-like pattern matching to find coordinates in the image
async function extractCoordinatesFromImageText(file) {
    return new Promise((resolve, reject) => {
        // Create an image element to read the file
        const img = new Image();
        const reader = new FileReader();
        
        reader.onload = (e) => {
            img.src = e.target.result;
            
            img.onload = () => {
                // Create a canvas to extract text (simplified approach)
                // Note: This is a basic implementation. For better results, you'd need a proper OCR library
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                // Try to extract coordinates using common patterns
                // This is a fallback - we'll look for coordinate patterns in the image data
                // For now, we'll use a simpler approach: prompt user if coordinates are visible
                
                // Check if image has text overlay by looking for common coordinate patterns
                // Pattern: "Lat 13.323528° Long 75.771964°" or "13.323528, 75.771964"
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                
                // Since we can't do real OCR easily, we'll use a manual input helper
                // Check the image preview - if user sees coordinates, they can click a button
                resolve(null); // Return null to indicate no automatic extraction
            };
        };
        
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Helper function to parse coordinate strings (for manual entry from image text)
function parseCoordinateString(text) {
    if (!text || typeof text !== 'string') return null;
    
    // Clean the text
    text = text.trim();
    
    // Try to find coordinates in various formats:
    // "Lat 13.323528° Long 75.771964°"
    // "lat 22.889299 Lon 22.169399" (from user's image)
    // "13.323528, 75.771964"
    // "26; 6; 22.8892999999952629" (DMS with semicolons from properties)
    // "13°19'24.7\"N 75°46'19.1\"E"
    
    const patterns = [
        // Pattern: "lat 22.889299 Lon 22.169399" - MOST COMMON from user images
        // This handles: "lat 22.889299 Lon 22.169399" or "lat 22.889299 lon 22.169399"
        /(?:lat|latitude)[:\s]*([+-]?\d+\.?\d+).*?(?:lon|long|longitude)[:\s]*([+-]?\d+\.?\d+)/i,
        // Pattern: "Lat 13.323528° Long 75.771964°"
        /Lat[itude:]*\s*([+-]?\d+\.?\d*)[°\s]*Long[itude:]*\s*([+-]?\d+\.?\d*)/i,
        // Pattern: "13.323528, 75.771964" or "13.323528,75.771964"
        /([+-]?\d+\.?\d+)[,\s]+([+-]?\d+\.?\d+)/,
        // Pattern: "26; 6; 22.8892999999952629" (DMS with semicolons)
        /([+-]?\d+)[;\s]+([+-]?\d+)[;\s]+([+-]?\d+\.?\d*)/,
        // Pattern: "13°19'24.7\"N 75°46'19.1\"E"
        /(\d+)°(\d+)'([\d.]+)"\s*([NS])\s+(\d+)°(\d+)'([\d.]+)"\s*([EW])/i,
    ];
    
    for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i];
        const match = text.match(pattern);
        if (match) {
            if (match.length === 3) {
                // Decimal format: "lat 22.889299 Lon 22.169399"
                const lat = parseFloat(match[1]);
                const lng = parseFloat(match[2]);
                if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                    return { latitude: lat, longitude: lng };
                }
            } else if (match.length === 4 && i === 3) {
                // DMS with semicolons: "26; 6; 22.8892999999952629"
                // This might be just one coordinate, try to find both
                const parts = text.split(/\s+/);
                let latParts = null;
                let lngParts = null;
                
                // Try to find latitude and longitude separately
                const latMatch = text.match(/(?:lat|latitude)[:\s]*([+-]?\d+)[;\s]+([+-]?\d+)[;\s]+([+-]?\d+\.?\d*)/i);
                const lngMatch = text.match(/(?:lon|long|longitude)[:\s]*([+-]?\d+)[;\s]+([+-]?\d+)[;\s]+([+-]?\d+\.?\d*)/i);
                
                if (latMatch && lngMatch) {
                    // Both found
                    const lat = parseFloat(latMatch[1]) + parseFloat(latMatch[2]) / 60 + parseFloat(latMatch[3]) / 3600;
                    const lng = parseFloat(lngMatch[1]) + parseFloat(lngMatch[2]) / 60 + parseFloat(lngMatch[3]) / 3600;
                    return { latitude: lat, longitude: lng };
                } else if (match[1] && match[2] && match[3]) {
                    // Single DMS coordinate found, assume it's the first one
                    const coord = parseFloat(match[1]) + parseFloat(match[2]) / 60 + parseFloat(match[3]) / 3600;
                    // Try to find the other coordinate
                    const otherMatch = text.match(/(?:lon|long|longitude)[:\s]*([+-]?\d+\.?\d*)/i);
                    if (otherMatch) {
                        return { latitude: coord, longitude: parseFloat(otherMatch[1]) };
                    }
                }
            } else if (match.length === 9) {
                // DMS format with refs
                const latDeg = parseFloat(match[1]);
                const latMin = parseFloat(match[2]);
                const latSec = parseFloat(match[3]);
                const latRef = match[4].toUpperCase();
                const lngDeg = parseFloat(match[5]);
                const lngMin = parseFloat(match[6]);
                const lngSec = parseFloat(match[7]);
                const lngRef = match[8].toUpperCase();
                
                let lat = latDeg + latMin / 60 + latSec / 3600;
                let lng = lngDeg + lngMin / 60 + lngSec / 3600;
                
                if (latRef === 'S') lat = -lat;
                if (lngRef === 'W') lng = -lng;
                
                return { latitude: lat, longitude: lng };
            }
        }
    }
    
    // Fallback: Try to extract any two numbers that look like coordinates
    const numbers = text.match(/([+-]?\d+\.?\d+)/g);
    if (numbers && numbers.length >= 2) {
        const lat = parseFloat(numbers[0]);
        const lng = parseFloat(numbers[1]);
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            return { latitude: lat, longitude: lng };
        }
    }
    
    return null;
}

// Convert file to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Reverse geocoding - Get address from coordinates using OpenStreetMap Nominatim
async function getLocationAddress(lat, lng) {
    try {
        // Use OpenStreetMap Nominatim API (free, no API key needed)
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            {
                headers: {
                    'User-Agent': 'TWINNIR-MapApp/1.0' // Required by Nominatim
                }
            }
        );
        
        if (!response.ok) {
            throw new Error('Geocoding failed');
        }
        
        const data = await response.json();
        
        if (data && data.address) {
            const addr = data.address;
            // Build a readable address string
            const addressParts = [];
            
            // Priority order for address components
            if (addr.road) addressParts.push(addr.road);
            if (addr.suburb) addressParts.push(addr.suburb);
            if (addr.city || addr.town || addr.village) {
                addressParts.push(addr.city || addr.town || addr.village);
            }
            if (addr.state || addr.region) {
                addressParts.push(addr.state || addr.region);
            }
            if (addr.country) addressParts.push(addr.country);
            
            if (addressParts.length > 0) {
                return addressParts.join(', ');
            }
            
            // Fallback to display name
            if (data.display_name) {
                return data.display_name;
            }
        }
        
        return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch (error) {
        console.log('Reverse geocoding error:', error);
        // Return coordinates as fallback
        return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
}

// Get location details with caching to avoid too many API calls
const locationCache = new Map();
async function getLocationAddressCached(lat, lng) {
    const cacheKey = `${lat.toFixed(4)}_${lng.toFixed(4)}`; // Round to 4 decimals for caching
    
    if (locationCache.has(cacheKey)) {
        return locationCache.get(cacheKey);
    }
    
    const address = await getLocationAddress(lat, lng);
    locationCache.set(cacheKey, address);
    
    return address;
}

// Show gallery for location - fetch from API
async function showGallery(lat, lng, category) {
    const galleryGrid = document.getElementById('galleryGrid');
    galleryGrid.innerHTML = '<p style="padding: 2rem; text-align: center; color: #666;">Loading media...</p>';
    
    try {
        // Check if user is authenticated
        const token = sessionStorage.getItem('twinner_token');
        const headers = {};
        
        // If authenticated, include token to get only user's media
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        // Fetch media from API by location
        let url = getApiUrl('/api/media/location');
        url += `?lat=${lat}&lng=${lng}`;
        if (category && category !== 'all') {
            url += `&category=${category}`;
        }
        
        console.log('📸 Fetching gallery media from:', url, token ? '(authenticated - user media only)' : '(public - all media)');
        const response = await fetch(url, {
            headers: headers
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch media');
        }
        
        const data = await response.json();
        const filteredMedia = data.media || [];
        
        galleryGrid.innerHTML = '';
        
        if (filteredMedia.length === 0) {
            galleryGrid.innerHTML = '<p style="padding: 2rem; text-align: center; color: #666;">No media found at this location</p>';
        } else {
            filteredMedia.forEach(item => {
                const galleryItem = document.createElement('div');
                galleryItem.className = 'gallery-item';
                
                if (item.file_type === 'image' && item.file_data) {
                    // Ensure base64 data has proper prefix
                    let imageSrc = item.file_data;
                    if (!imageSrc.startsWith('data:')) {
                        const ext = item.filename.toLowerCase().split('.').pop();
                        const mimeType = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
                        imageSrc = `data:${mimeType};base64,${imageSrc}`;
                    }
                    galleryItem.innerHTML = `
                        <img src="${imageSrc}" alt="${item.filename}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover;"
                             onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=\\'padding: 2rem; text-align: center; color: #999; background: #f5f5f5; height: 100%; display: flex; flex-direction: column; justify-content: center;\\'><p>Image unavailable</p><p style=\\'font-size: 0.85rem; margin-top: 0.5rem;\\'>${item.filename}</p></div>';">
                        <div class="overlay">
                            <div style="font-weight: 600;">${item.filename}</div>
                            <div style="font-size: 0.75rem; margin-top: 0.25rem;">${item.description || 'No description'}</div>
                            <div style="font-size: 0.7rem; margin-top: 0.25rem; color: #999;">${new Date(item.upload_date).toLocaleDateString()}</div>
                        </div>
                    `;
                } else if (item.file_type === 'video' && item.file_data) {
                    galleryItem.innerHTML = `
                        <video src="${item.file_data}" controls preload="metadata" style="width: 100%; height: 100%; object-fit: cover;"></video>
                        <div class="overlay">
                            <div style="font-weight: 600;">${item.filename}</div>
                            <div style="font-size: 0.75rem; margin-top: 0.25rem;">${item.description || 'No description'}</div>
                            <div style="font-size: 0.7rem; margin-top: 0.25rem; color: #999;">${new Date(item.upload_date).toLocaleDateString()}</div>
                        </div>
                    `;
                } else {
                    galleryItem.innerHTML = `
                        <div style="padding: 2rem; text-align: center; color: #999; background: #f5f5f5; height: 100%; display: flex; flex-direction: column; justify-content: center;">
                            <p>Media unavailable</p>
                            <p style="font-size: 0.85rem; margin-top: 0.5rem;">${item.filename}</p>
                        </div>
                    `;
                }
                
                galleryGrid.appendChild(galleryItem);
            });
        }
        
        document.getElementById('galleryTitle').textContent = 
            `${getCategoryName(category || 'all')} - ${filteredMedia.length} item(s)`;
        document.getElementById('galleryModal').classList.remove('hidden');
        
        console.log(`✅ Gallery loaded: ${filteredMedia.length} items`);
    } catch (error) {
        console.error('❌ Error loading gallery:', error);
        galleryGrid.innerHTML = '<p style="padding: 2rem; text-align: center; color: #f44336;">Error loading media. Please try again.</p>';
    }
}

// Expose globally
window.showGallery = showGallery;

// Close gallery modal (exposed globally)
window.closeGalleryModal = function closeGalleryModal() {
    document.getElementById('galleryModal').classList.add('hidden');
}

// Get category display name
function getCategoryName(category) {
    const names = {
        'solar': 'Solar Panels',
        'equipment': 'Equipment',
        'building': 'Buildings',
        'infrastructure': 'Infrastructure',
        'other': 'Other'
    };
    return names[category] || category;
}

// Annotation functions - Leaflet Draw handles these automatically via its toolbar
// No custom functions needed - users click the toolbar buttons

// Matterport integration
let matterportSDK = null;
let currentMatterportSweep = null;

function show360Views() {
    // Show a modal to select or enter Matterport sweep ID
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <h2>360° Matterport View</h2>
            <p style="margin-bottom: 1rem; color: #666;">Enter a Matterport sweep ID or select from existing locations:</p>
            <div class="form-group">
                <label for="matterportSweepId">Matterport Sweep ID</label>
                <input type="text" id="matterportSweepId" placeholder="e.g., abc123xyz" style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px;">
                <p style="font-size: 0.85rem; color: #666; margin-top: 0.5rem;">You can find this in your Matterport dashboard</p>
            </div>
            <button onclick="loadMatterportView()" class="btn-submit" style="width: 100%; margin-top: 1rem;">Load 360° View</button>
            <button onclick="this.parentElement.parentElement.remove()" style="width: 100%; margin-top: 0.5rem; padding: 0.75rem; background: #ccc; color: #333; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

function loadMatterportView() {
    const sweepId = document.getElementById('matterportSweepId').value.trim();
    if (!sweepId) {
        alert('Please enter a Matterport sweep ID');
        return;
    }
    
    // Close modal
    document.querySelector('.modal').remove();
    
    // Show Matterport viewer
    showMatterportViewer(sweepId);
}

function showMatterportViewer(sweepId) {
    // Hide map
    document.getElementById('map').style.display = 'none';
    
    // Show Matterport container
    let container = document.getElementById('matterportContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'matterportContainer';
        container.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 10000; background: #000;';
        document.body.appendChild(container);
    }
    
    container.innerHTML = `
        <div style="position: absolute; top: 20px; right: 20px; z-index: 10001;">
            <button onclick="closeMatterportViewer()" style="padding: 0.75rem 1.5rem; background: #fff; color: #333; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                ✕ Close
            </button>
        </div>
        <div id="matterportViewer" style="width: 100%; height: 100%;"></div>
    `;
    container.style.display = 'block';
    
    // Initialize Matterport SDK
    if (typeof SDK !== 'undefined') {
        try {
            const iframe = document.createElement('iframe');
            iframe.allow = 'fullscreen; xr-spatial-tracking';
            iframe.allowFullscreen = true;
            iframe.src = `https://my.matterport.com/show/?m=${sweepId}`;
            iframe.style.cssText = 'width: 100%; height: 100%; border: none;';
            
            document.getElementById('matterportViewer').appendChild(iframe);
            currentMatterportSweep = sweepId;
            
            console.log('✅ Matterport viewer loaded:', sweepId);
        } catch (error) {
            console.error('❌ Error loading Matterport:', error);
            alert('Failed to load Matterport view. Please check the sweep ID.');
            closeMatterportViewer();
        }
    } else {
        console.error('Matterport SDK not loaded');
        alert('Matterport SDK not available. Please refresh the page.');
        closeMatterportViewer();
    }
}

function closeMatterportViewer() {
    const container = document.getElementById('matterportContainer');
    if (container) {
        container.style.display = 'none';
        container.innerHTML = '';
    }
    
    // Show map again
    document.getElementById('map').style.display = 'block';
    currentMatterportSweep = null;
}

// Make functions globally accessible
window.show360Views = show360Views;
window.loadMatterportView = loadMatterportView;
window.closeMatterportViewer = closeMatterportViewer;

function showDroneFootage() {
    // Open Google Drive folder in new tab
    window.open('https://drive.google.com/drive/folders/145UnvvoadbqJjg7VjREnkoo-QOGF9gUg', '_blank');
}

// Header dropdown handlers
function handleOrganizationChange() {
    const org = document.getElementById('organizationSelect').value;
    console.log('Organization changed:', org);
    // Filter markers by organization
    applySearchFilter('all'); // Reset filter for now
}

function handleSpaceChange() {
    const space = document.getElementById('spaceSelect').value;
    console.log('Space changed:', space);
}

function handleSpaceTypeChange() {
    const spaceType = document.getElementById('spaceTypeSelect').value;
    console.log('Space Type changed:', spaceType);
}

function handleAssetChange() {
    const asset = document.getElementById('assetSelect').value;
    console.log('Asset changed:', asset);
}

function handleAssetTypeChange() {
    const assetType = document.getElementById('assetTypeSelect').value;
    console.log('Asset Type changed:', assetType);
    // Filter markers by asset type
    if (assetType) {
        applySearchFilter(assetType);
    } else {
        applySearchFilter('all');
    }
}

function handlePropertiesChange() {
    const properties = document.getElementById('propertiesSelect').value;
    console.log('Properties changed:', properties);
}

function handleExport() {
    alert('Export feature coming soon!');
}

// Export data function is in map-db.js

// Close modals when clicking outside
window.onclick = function(event) {
    const loginModal = document.getElementById('loginModal');
    const uploadModal = document.getElementById('uploadModal');
    const galleryModal = document.getElementById('galleryModal');
    
    if (event.target === loginModal) {
        closeLoginModal();
    }
    if (event.target === uploadModal) {
        closeUploadModal();
    }
    if (event.target === galleryModal) {
        closeGalleryModal();
    }
}

