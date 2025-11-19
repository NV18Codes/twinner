// Virtual Tour 3D View - Similar to rcs3d.co.za style
let tourScene = null;
let tourCamera = null;
let tourRenderer = null;
let tourControls = null;
let currentTourLocation = null;
let isTourActive = false;

// Initialize virtual tour view
function initVirtualTour() {
    const tourView = document.getElementById('virtualTourView');
    const tourCanvas = document.getElementById('tourCanvas');
    
    if (!tourView || !tourCanvas) return;
    
    // Create Three.js scene
    tourScene = new THREE.Scene();
    tourScene.background = new THREE.Color(0x1a1a1a);
    
    // Create camera
    tourCamera = new THREE.PerspectiveCamera(
        75,
        tourCanvas.clientWidth / tourCanvas.clientHeight,
        0.1,
        1000
    );
    tourCamera.position.set(0, 5, 10);
    
    // Create renderer
    tourRenderer = new THREE.WebGLRenderer({ 
        canvas: tourCanvas,
        antialias: true,
        alpha: true
    });
    tourRenderer.setSize(tourCanvas.clientWidth, tourCanvas.clientHeight);
    tourRenderer.setPixelRatio(window.devicePixelRatio);
    
    // Add orbit controls for navigation
    tourControls = new THREE.OrbitControls(tourCamera, tourRenderer.domElement);
    tourControls.enableDamping = true;
    tourControls.dampingFactor = 0.05;
    tourControls.minDistance = 2;
    tourControls.maxDistance = 50;
    tourControls.enablePan = true;
    tourControls.enableZoom = true;
    tourControls.enableRotate = true;
    
    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    tourScene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    tourScene.add(directionalLight);
    
    // Add grid helper
    const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
    tourScene.add(gridHelper);
    
    // Handle window resize
    window.addEventListener('resize', onTourWindowResize);
    
    // Start render loop
    animateTour();
}

// Animate tour view
function animateTour() {
    if (!isTourActive) return;
    
    requestAnimationFrame(animateTour);
    
    if (tourControls) {
        tourControls.update();
    }
    
    if (tourRenderer && tourScene && tourCamera) {
        tourRenderer.render(tourScene, tourCamera);
    }
}

// Handle window resize
function onTourWindowResize() {
    if (!tourCamera || !tourRenderer) return;
    
    const tourCanvas = document.getElementById('tourCanvas');
    if (!tourCanvas) return;
    
    tourCamera.aspect = tourCanvas.clientWidth / tourCanvas.clientHeight;
    tourCamera.updateProjectionMatrix();
    tourRenderer.setSize(tourCanvas.clientWidth, tourCanvas.clientHeight);
}

// Enter virtual tour with media from database
function enterVirtualTourWithMedia(lat, lng, category) {
    const media = getMediaByLocation(lat, lng);
    const filteredMedia = category ? media.filter(m => m.category === category) : media;
    enterVirtualTour(lat, lng, category, filteredMedia);
}

// Enter virtual tour mode for a location
function enterVirtualTour(lat, lng, category, media = []) {
    const mapView = document.getElementById('map');
    const tourView = document.getElementById('virtualTourView');
    
    if (!tourView || !mapView) return;
    
    // Store current location data
    currentTourLocation = { lat, lng, category, media };
    
    // Hide map, show tour
    mapView.style.display = 'none';
    tourView.classList.remove('hidden');
    isTourActive = true;
    
    // Initialize tour if not already done
    if (!tourScene) {
        initVirtualTour();
    }
    
    // Clear previous scene objects (except lights and helpers)
    if (tourScene) {
        const objectsToRemove = [];
        tourScene.traverse((child) => {
            if (child !== tourCamera && 
                child.type !== 'AmbientLight' && 
                child.type !== 'DirectionalLight' &&
                child.type !== 'GridHelper') {
                objectsToRemove.push(child);
            }
        });
        objectsToRemove.forEach(obj => tourScene.remove(obj));
    }
    
    // Create 3D representation of the location
    createLocation3DModel(lat, lng, category, media);
    
    // Update info panel
    updateTourInfoPanel(lat, lng, category, media);
    
    // Get address
    getLocationAddressCached(lat, lng).then(address => {
        const addressEl = document.getElementById('tourLocationAddress');
        if (addressEl) {
            addressEl.textContent = address;
        }
    });
    
    // Start animation
    animateTour();
}

// Create 3D model for location
function createLocation3DModel(lat, lng, category, media) {
    if (!tourScene) return;
    
    const color = categoryColors[category] || categoryColors.other;
    
    // Create a building/asset representation
    const geometry = new THREE.BoxGeometry(3, 4, 3);
    const material = new THREE.MeshStandardMaterial({ 
        color: color,
        metalness: 0.3,
        roughness: 0.7
    });
    const building = new THREE.Mesh(geometry, material);
    building.position.set(0, 2, 0);
    building.castShadow = true;
    building.receiveShadow = true;
    tourScene.add(building);
    
    // Add category label
    if (typeof THREE !== 'undefined') {
        // Create text sprite or plane with text
        const loader = new THREE.FontLoader();
        // For now, add a simple plane with color
        const labelGeometry = new THREE.PlaneGeometry(2, 0.5);
        const labelMaterial = new THREE.MeshBasicMaterial({ 
            color: color,
            transparent: true,
            opacity: 0.8
        });
        const label = new THREE.Mesh(labelGeometry, labelMaterial);
        label.position.set(0, 4.5, 0);
        label.lookAt(tourCamera.position);
        tourScene.add(label);
    }
    
    // Add media markers around the building
    media.forEach((item, index) => {
        const angle = (index / media.length) * Math.PI * 2;
        const radius = 5;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        // Create marker sphere
        const markerGeometry = new THREE.SphereGeometry(0.3, 16, 16);
        const markerMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffffff,
            emissive: color,
            emissiveIntensity: 0.5
        });
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        marker.position.set(x, 1, z);
        marker.userData = { mediaItem: item };
        tourScene.add(marker);
        
        // Add click handler
        marker.onClick = () => {
            showMediaInTour(item);
        };
    });
    
    // Add ground plane
    const groundGeometry = new THREE.PlaneGeometry(20, 20);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x2a2a2a,
        roughness: 0.8,
        metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    tourScene.add(ground);
}

// Update tour info panel
function updateTourInfoPanel(lat, lng, category, media) {
    const nameEl = document.getElementById('tourLocationName');
    const galleryEl = document.getElementById('tourMediaGallery');
    
    if (nameEl) {
        nameEl.textContent = getCategoryName(category);
    }
    
    if (galleryEl) {
        galleryEl.innerHTML = '';
        
        if (media.length === 0) {
            galleryEl.innerHTML = '<p style="color: #999; padding: 1rem;">No media at this location</p>';
        } else {
            media.forEach(item => {
                const mediaItem = document.createElement('div');
                mediaItem.className = 'tour-media-item';
                mediaItem.innerHTML = `
                    <div class="tour-media-thumb">
                        ${item.file_type === 'image' 
                            ? `<img src="${item.file_data}" alt="${item.filename}">`
                            : `<video src="${item.file_data}" controls></video>`
                        }
                    </div>
                    <div class="tour-media-info">
                        <strong>${item.filename}</strong>
                        <p>${item.description || 'No description'}</p>
                    </div>
                `;
                galleryEl.appendChild(mediaItem);
            });
        }
    }
}

// Show media in tour
function showMediaInTour(mediaItem) {
    // Create modal or overlay to show full media
    const modal = document.createElement('div');
    modal.className = 'tour-media-modal';
    modal.innerHTML = `
        <div class="tour-media-modal-content">
            <span class="tour-modal-close" onclick="this.parentElement.parentElement.remove()">&times;</span>
            ${mediaItem.file_type === 'image' 
                ? `<img src="${mediaItem.file_data}" alt="${mediaItem.filename}" style="max-width: 100%; max-height: 80vh;">`
                : `<video src="${mediaItem.file_data}" controls style="max-width: 100%; max-height: 80vh;"></video>`
            }
            <h3>${mediaItem.filename}</h3>
            <p>${mediaItem.description || 'No description'}</p>
        </div>
    `;
    document.body.appendChild(modal);
}

// Exit virtual tour
function exitVirtualTour() {
    const mapView = document.getElementById('map');
    const tourView = document.getElementById('virtualTourView');
    
    if (!tourView || !mapView) return;
    
    tourView.classList.add('hidden');
    mapView.style.display = 'block';
    isTourActive = false;
    currentTourLocation = null;
}

// Toggle fullscreen
function toggleTourFullscreen() {
    const tourView = document.getElementById('virtualTourView');
    if (!tourView) return;
    
    if (!document.fullscreenElement) {
        tourView.requestFullscreen().catch(err => {
            console.log('Error attempting to enable fullscreen:', err);
        });
    } else {
        document.exitFullscreen();
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Virtual tour will be initialized when first used
});

