// Map Application Logic - Google Maps Version
let map = null;
let markers = [];
let sidebarOpen = false;
let isAuthenticated = false;
let streetViewService = null;
let streetViewPanorama = null;

// Category colors
const categoryColors = {
    'solar': '#ff9800',      // Orange
    'unused': '#8d6e63',     // Brown
    'building': '#2196f3',    // Blue
    'equipment': '#9c27b0',  // Purple
    'other': '#607d8b'        // Blue Grey
};

// Initialize application
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication status
    checkAuthStatus();
    
    // Wait for Google Maps to be available
    if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
        console.error('Google Maps API not loaded');
        document.getElementById('map').innerHTML = '<div style="padding: 2rem; text-align: center; color: #fff; background: #000;"><h3>Map Loading Error</h3><p>Google Maps library failed to load. Please check your API key.</p></div>';
        return;
    }
    
    // Initialize map first (before database)
    initMap();
    
    // Initialize database
    const dbReady = await initDatabase();
    if (!dbReady) {
        console.warn('Failed to initialize database. Some features may not work.');
    }
    
    // Setup event listeners
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', (e) => {
            filterMarkers(e.target.value);
        });
    }
    
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
                        const previewVideo = document.getElementById('previewVideo');
                        if (previewVideo) previewVideo.style.display = 'none';
                        preview.style.display = 'block';
                    };
                    reader.readAsDataURL(file);
                }
                
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
                            latInput.value = lat.toFixed(6);
                            lngInput.value = lng.toFixed(6);
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
function checkAuthStatus() {
    const authStatus = sessionStorage.getItem('twinner_auth');
    isAuthenticated = authStatus === 'authenticated';
}

// Update UI based on authentication
function updateUIForAuth() {
    const uploadBtn = document.querySelector('.btn-upload');
    if (uploadBtn) {
        if (isAuthenticated) {
            uploadBtn.style.display = 'block';
            uploadBtn.textContent = 'Upload Media';
        } else {
            uploadBtn.style.display = 'block';
            uploadBtn.textContent = 'Login to Upload';
            uploadBtn.onclick = () => showLoginModal();
        }
    }
}

// Initialize Google Maps
function initMap() {
    try {
        // Check if Google Maps is loaded
        if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
            console.error('Google Maps not loaded');
            document.getElementById('map').innerHTML = `
                <div style="padding: 2rem; text-align: center; color: #fff; background: #000;">
                    <h3>Google Maps API Error</h3>
                    <p>Please check:</p>
                    <ol style="text-align: left; display: inline-block; margin-top: 1rem;">
                        <li>API key is correct in map.html</li>
                        <li>Maps JavaScript API is enabled in Google Cloud Console</li>
                        <li>API key restrictions allow localhost (for development)</li>
                        <li>Billing is enabled (required even for free tier)</li>
                    </ol>
                    <p style="margin-top: 1rem; font-size: 0.9rem;">
                        See GOOGLE_MAPS_FIX.md for detailed instructions
                    </p>
                </div>
            `;
            return;
        }

        // Center on South Africa (Johannesburg)
        const center = { lat: -26.2041, lng: 28.0473 };

        // Initialize map with 3D buildings enabled
        map = new google.maps.Map(document.getElementById('map'), {
            center: center,
            zoom: 13,
            tilt: 45, // 3D tilt like Google Maps
            mapTypeId: 'roadmap', // Start with roadmap (street view)
            mapTypeControl: true,
            mapTypeControlOptions: {
                style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
                position: google.maps.ControlPosition.TOP_RIGHT,
                mapTypeIds: ['roadmap', 'satellite', 'hybrid', 'terrain']
            },
            streetViewControl: true, // Enable Street View control
            streetViewControlOptions: {
                position: google.maps.ControlPosition.TOP_RIGHT
            },
            fullscreenControl: true,
            zoomControl: true,
            rotateControl: true,
            scaleControl: true
        });

        // Initialize Street View service
        streetViewService = new google.maps.StreetViewService();

        console.log('Google Maps loaded successfully');
        
        // Load markers after map is ready
        google.maps.event.addListenerOnce(map, 'idle', () => {
            loadMarkers();
        });
        
        // Add click handler for map - allow setting location by clicking
        map.addListener('click', (e) => {
            // If upload modal is open, set coordinates from map click
            const uploadModal = document.getElementById('uploadModal');
            if (uploadModal && !uploadModal.classList.contains('hidden')) {
                const latInput = document.getElementById('latitude');
                const lngInput = document.getElementById('longitude');
                const locationStatus = document.getElementById('locationStatus');
                
                if (latInput && lngInput) {
                    latInput.value = e.latLng.lat().toFixed(6);
                    lngInput.value = e.latLng.lng().toFixed(6);
                    latInput.removeAttribute('readonly');
                    lngInput.removeAttribute('readonly');
                    
                    // Get address for clicked location
                    locationStatus.textContent = 'Getting address...';
                    locationStatus.style.color = '#2196f3';
                    getLocationAddressCached(e.latLng.lat(), e.latLng.lng()).then(address => {
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

// Load markers from database
function loadMarkers(categoryFilter = 'all') {
    if (!map) {
        console.error('Map not initialized');
        return;
    }
    
    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    markers = [];
    
    // Get grouped locations
    const locations = getGroupedLocations(categoryFilter);
    
    if (locations.length === 0) {
        console.log('No locations found in database');
        updateSidebar([]);
        return;
    }
    
    locations.forEach(location => {
        const color = categoryColors[location.category] || categoryColors.other;
        const media = getMediaByLocation(location.lat, location.lng);
        
        // Create marker
        const marker = new google.maps.Marker({
            position: { lat: location.lat, lng: location.lng },
            map: map,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: color,
                fillOpacity: 1,
                strokeColor: '#fff',
                strokeWeight: 2
            },
            title: getCategoryName(location.category)
        });
        
        // Create info window content
        const mediaDetails = media.map(m => {
            const date = new Date(m.upload_date).toLocaleDateString();
            return `<div style="border-bottom: 1px solid #eee; padding: 0.25rem 0; font-size: 0.85rem;">
                <strong>${m.filename}</strong><br>
                <span style="color: #666;">${m.description || 'No description'}</span><br>
                <span style="color: #999; font-size: 0.75rem;">${date}</span>
            </div>`;
        }).join('');
        
        // Get address for location
        getLocationAddressCached(location.lat, location.lng).then(address => {
            const infoContent = `
                <div style="padding: 0.5rem; min-width: 200px; max-width: 300px;">
                    <h4 style="margin-bottom: 0.5rem; font-size: 1rem; color: ${color};">${getCategoryName(location.category)}</h4>
                    <p style="margin: 0 0 0.5rem 0; color: #666; font-size: 0.9rem;">
                        <strong>${location.count}</strong> item(s) at this location
                    </p>
                    <div style="margin-bottom: 0.5rem; padding: 0.5rem; background: #e3f2fd; border-radius: 4px; border-left: 3px solid ${color};">
                        <strong style="font-size: 0.85rem; color: #1976d2;">📍 Location:</strong><br>
                        <span style="font-size: 0.85rem; color: #333;">${address}</span>
                    </div>
                    <div style="max-height: 200px; overflow-y: auto; margin-bottom: 0.5rem; padding: 0.5rem; background: #f5f5f5; border-radius: 4px;">
                        ${mediaDetails || '<p style="font-size: 0.85rem; color: #666;">No details available</p>'}
                    </div>
                    <button onclick="showGallery(${location.lat}, ${location.lng}, '${location.category}')" 
                            style="margin-top: 0.5rem; padding: 0.5rem; background: ${color}; color: #fff; border: none; border-radius: 4px; cursor: pointer; width: 100%; font-weight: 600;">
                        View All Media
                    </button>
                    <button onclick="openStreetView(${location.lat}, ${location.lng})" 
                            style="margin-top: 0.5rem; padding: 0.5rem; background: #4285f4; color: #fff; border: none; border-radius: 4px; cursor: pointer; width: 100%; font-weight: 600;">
                        🚶 Street View
                    </button>
                </div>
            `;
            
            const infoWindow = new google.maps.InfoWindow({
                content: infoContent
            });
            
            // Show info window on marker click
            marker.addListener('click', () => {
                infoWindow.open(map, marker);
            });
            
            // Show info window on hover
            marker.addListener('mouseover', () => {
                infoWindow.open(map, marker);
            });
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

// Open Street View
function openStreetView(lat, lng) {
    const position = { lat: lat, lng: lng };
    
    streetViewService.getPanorama({ location: position, radius: 50 }, (data, status) => {
        if (status === 'OK') {
            // Create Street View panorama
            if (!streetViewPanorama) {
                streetViewPanorama = new google.maps.StreetViewPanorama(
                    document.getElementById('map'),
                    {
                        position: position,
                        pov: { heading: 270, pitch: 0 },
                        visible: true
                    }
                );
                map.setStreetView(streetViewPanorama);
            } else {
                streetViewPanorama.setPosition(position);
                streetViewPanorama.setVisible(true);
            }
        } else {
            alert('Street View is not available at this location.');
        }
    });
}

// Filter markers by category
function filterMarkers(category) {
    loadMarkers(category);
}

// Get category name
function getCategoryName(category) {
    const names = {
        'solar': 'Solar Panels',
        'unused': 'Unused Assets',
        'building': 'Buildings',
        'equipment': 'Equipment',
        'other': 'Other'
    };
    return names[category] || category;
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
            // Google Maps uses flyTo with lat/lng
            map.setCenter({ lat: location.lat, lng: location.lng });
            map.setZoom(16);
            map.setTilt(45);
            
            // Open info window for the marker at this location
            setTimeout(() => {
                const marker = markers.find(m => 
                    Math.abs(m._data.lat - location.lat) < 0.001 && 
                    Math.abs(m._data.lng - location.lng) < 0.001 &&
                    m._data.category === location.category
                );
                if (marker) {
                    google.maps.event.trigger(marker, 'click');
                }
            }, 500);
            showGallery(location.lat, location.lng, location.category);
        });
        
        locationList.appendChild(item);
    });
}

// Show upload modal
function showUploadModal() {
    if (!isAuthenticated) {
        showLoginModal();
        return;
    }
    document.getElementById('uploadModal').classList.remove('hidden');
}

// Close upload modal
function closeUploadModal() {
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
    
    const coords = parseCoordinateString(coordText);
    if (coords && coords.latitude && coords.longitude) {
        latInput.value = coords.latitude.toFixed(6);
        lngInput.value = coords.longitude.toFixed(6);
        latInput.removeAttribute('readonly');
        lngInput.removeAttribute('readonly');
        locationStatus.textContent = '✓ Coordinates extracted from text!';
        locationStatus.style.color = '#23d18b';
        
        // Fetch address
        getLocationAddressCached(coords.latitude, coords.longitude).then(address => {
            locationStatus.textContent = `✓ Location: ${address}`;
        });
    } else {
        alert('Could not parse coordinates. Try formats like:\n- "Lat 13.323528° Long 75.771964°"\n- "13.323528, 75.771964"\n- "13.323528,75.771964"');
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
                const lat = position.coords.latitude.toFixed(6);
                const lng = position.coords.longitude.toFixed(6);
                
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

// Handle file upload
async function handleUpload(event) {
    event.preventDefault();
    
    const fileInput = document.getElementById('mediaFile');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Please select a file');
        return;
    }
    
    const category = document.getElementById('category').value;
    const description = document.getElementById('description').value;
    let latitude = parseFloat(document.getElementById('latitude').value);
    let longitude = parseFloat(document.getElementById('longitude').value);
    
    // For images: Try to extract EXIF geotags first
    if (file.type.startsWith('image/')) {
        try {
            const exifData = await getExifData(file);
            if (exifData && exifData.latitude && exifData.longitude) {
                latitude = exifData.latitude;
                longitude = exifData.longitude;
                document.getElementById('latitude').value = latitude.toFixed(6);
                document.getElementById('longitude').value = longitude.toFixed(6);
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
    
    // Convert file to base64
    const fileData = await fileToBase64(file);
    const fileType = file.type.startsWith('image/') ? 'image' : 'video';
    
    // Insert into database
    insertMedia(file.name, fileData, latitude, longitude, category, description, fileType);
    
    // Reload markers
    const categoryFilter = document.getElementById('categoryFilter').value;
    loadMarkers(categoryFilter);
    
    // Close modal
    closeUploadModal();
    
    alert('Media uploaded successfully! Pin added to map.');
}

// Get EXIF data from image (same as before)
function getExifData(file) {
    return new Promise((resolve, reject) => {
        try {
            if (typeof EXIF === 'undefined') {
                reject('EXIF library not loaded');
                return;
            }
            
            EXIF.getData(file, function() {
                try {
                    let lat = EXIF.getTag(this, 'GPSLatitude');
                    let latRef = EXIF.getTag(this, 'GPSLatitudeRef');
                    let lng = EXIF.getTag(this, 'GPSLongitude');
                    let lngRef = EXIF.getTag(this, 'GPSLongitudeRef');
                    
                    if (!lat || !lng) {
                        const allData = EXIF.getAllTags(this);
                        lat = lat || allData.GPSLatitude;
                        latRef = latRef || allData.GPSLatitudeRef;
                        lng = lng || allData.GPSLongitude;
                        lngRef = lngRef || allData.GPSLongitudeRef;
                        
                        if (!lat || !lng) {
                            const gpsInfo = allData.GPS || {};
                            lat = lat || gpsInfo.GPSLatitude;
                            latRef = latRef || gpsInfo.GPSLatitudeRef;
                            lng = lng || gpsInfo.GPSLongitude;
                            lngRef = lngRef || gpsInfo.GPSLongitudeRef;
                        }
                    }
                    
                    if (lat && typeof lat === 'string' && lat.includes(';')) {
                        const parts = lat.split(';').map(p => parseFloat(p.trim()));
                        if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
                            lat = parts;
                        }
                    }
                    if (lng && typeof lng === 'string' && lng.includes(';')) {
                        const parts = lng.split(';').map(p => parseFloat(p.trim()));
                        if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
                            lng = parts;
                        }
                    }
                    
                    if (lat && lng) {
                        let latitude, longitude;
                        
                        if (typeof lat === 'number' && typeof lng === 'number') {
                            latitude = lat;
                            longitude = lng;
                        } else if (Array.isArray(lat) && Array.isArray(lng)) {
                            latitude = convertDMSToDD(lat, latRef);
                            longitude = convertDMSToDD(lng, lngRef);
                        } else {
                            latitude = parseFloat(lat);
                            longitude = parseFloat(lng);
                            
                            if (isNaN(latitude) || isNaN(longitude)) {
                                reject('Invalid GPS coordinate format');
                                return;
                            }
                            
                            if (latRef === 'S' || latRef === 's') latitude = -latitude;
                            if (lngRef === 'W' || lngRef === 'w') longitude = -longitude;
                        }
                        
                        if (isNaN(latitude) || isNaN(longitude)) {
                            reject('Invalid GPS coordinates');
                            return;
                        }
                        
                        console.log('EXIF GPS found:', latitude, longitude);
                        resolve({ latitude, longitude });
                    } else {
                        console.log('No GPS tags found in EXIF');
                        reject('No GPS data found in EXIF');
                    }
                } catch (error) {
                    console.error('Error reading EXIF tags:', error);
                    reject('Error reading EXIF data: ' + error.message);
                }
            });
        } catch (error) {
            console.error('EXIF getData error:', error);
            reject('EXIF extraction failed: ' + error.message);
        }
    });
}

// Convert DMS to Decimal Degrees
function convertDMSToDD(dms, ref) {
    if (!Array.isArray(dms) || dms.length < 3) {
        throw new Error('Invalid DMS format');
    }
    
    const degrees = typeof dms[0] === 'string' ? parseFloat(dms[0]) : dms[0];
    const minutes = typeof dms[1] === 'string' ? parseFloat(dms[1]) : dms[1];
    const seconds = typeof dms[2] === 'string' ? parseFloat(dms[2]) : dms[2];
    
    if (isNaN(degrees) || isNaN(minutes) || isNaN(seconds)) {
        throw new Error('Invalid DMS values');
    }
    
    let dd = degrees + minutes / 60 + seconds / (60 * 60);
    if (ref === 'S' || ref === 'W' || ref === 's' || ref === 'w') {
        dd = dd * -1;
    }
    return dd;
}

// Helper function to parse coordinate strings
function parseCoordinateString(text) {
    const patterns = [
        /Lat[itude:]*\s*([+-]?\d+\.?\d*)[°\s]*Long[itude:]*\s*([+-]?\d+\.?\d*)/i,
        /([+-]?\d+\.?\d+)[,\s]+([+-]?\d+\.?\d+)/,
        /(\d+)°(\d+)'([\d.]+)"\s*([NS])\s+(\d+)°(\d+)'([\d.]+)"\s*([EW])/i,
    ];
    
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            if (match.length === 3) {
                const lat = parseFloat(match[1]);
                const lng = parseFloat(match[2]);
                if (!isNaN(lat) && !isNaN(lng)) {
                    return { latitude: lat, longitude: lng };
                }
            } else if (match.length === 9) {
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

// Reverse geocoding - Get address from coordinates
async function getLocationAddress(lat, lng) {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            {
                headers: {
                    'User-Agent': 'TWINNER-MapApp/1.0'
                }
            }
        );
        
        if (!response.ok) {
            throw new Error('Geocoding failed');
        }
        
        const data = await response.json();
        
        if (data && data.address) {
            const addr = data.address;
            const addressParts = [];
            
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
            
            if (data.display_name) {
                return data.display_name;
            }
        }
        
        return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch (error) {
        console.log('Reverse geocoding error:', error);
        return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
}

// Get location details with caching
const locationCache = new Map();
async function getLocationAddressCached(lat, lng) {
    const cacheKey = `${lat.toFixed(4)}_${lng.toFixed(4)}`;
    
    if (locationCache.has(cacheKey)) {
        return locationCache.get(cacheKey);
    }
    
    const address = await getLocationAddress(lat, lng);
    locationCache.set(cacheKey, address);
    
    return address;
}

// Show gallery for location
function showGallery(lat, lng, category) {
    const media = getMediaByLocation(lat, lng);
    const filteredMedia = category ? media.filter(m => m.category === category) : media;
    
    const galleryGrid = document.getElementById('galleryGrid');
    const galleryTitle = document.getElementById('galleryTitle');
    const galleryModal = document.getElementById('galleryModal');
    
    if (!galleryGrid || !galleryTitle || !galleryModal) return;
    
    galleryTitle.textContent = `Media at ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    galleryGrid.innerHTML = '';
    
    if (filteredMedia.length === 0) {
        galleryGrid.innerHTML = '<p style="padding: 2rem; text-align: center; color: #666;">No media found at this location</p>';
    } else {
        filteredMedia.forEach(item => {
            const galleryItem = document.createElement('div');
            galleryItem.className = 'gallery-item';
            
            if (item.file_type === 'image') {
                galleryItem.innerHTML = `
                    <img src="${item.file_data}" alt="${item.filename}">
                    <div class="overlay">
                        <strong>${item.filename}</strong><br>
                        ${item.description || 'No description'}
                    </div>
                `;
            } else {
                galleryItem.innerHTML = `
                    <video src="${item.file_data}" controls></video>
                    <div class="overlay">
                        <strong>${item.filename}</strong><br>
                        ${item.description || 'No description'}
                    </div>
                `;
            }
            
            galleryGrid.appendChild(galleryItem);
        });
    }
    
    galleryModal.classList.remove('hidden');
}

// Close gallery modal
function closeGalleryModal() {
    document.getElementById('galleryModal').classList.add('hidden');
}

// Toggle sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');
    sidebarOpen = !sidebarOpen;
}

// Show login modal
function showLoginModal() {
    document.getElementById('loginModal').classList.remove('hidden');
}

// Close login modal
function closeLoginModal() {
    document.getElementById('loginModal').classList.add('hidden');
}

// Handle login
function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    // Mock authentication for demo
    if (email && password) {
        sessionStorage.setItem('twinner_auth', 'authenticated');
        isAuthenticated = true;
        updateUIForAuth();
        closeLoginModal();
        alert('Login successful! You can now upload media.');
    } else {
        alert('Please enter email and password');
    }
}

// Close modals when clicking outside
window.onclick = function(event) {
    const uploadModal = document.getElementById('uploadModal');
    const loginModal = document.getElementById('loginModal');
    const galleryModal = document.getElementById('galleryModal');
    
    if (event.target === uploadModal) {
        closeUploadModal();
    }
    if (event.target === loginModal) {
        closeLoginModal();
    }
    if (event.target === galleryModal) {
        closeGalleryModal();
    }
}

