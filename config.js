// API Configuration
// This reads from environment variable, window variable, or uses default
// For Netlify: Set REACT_APP_API_URL in environment variables
// For local: Uses localhost:3000
const API_BASE_URL = (() => {
    // Check for Netlify/build-time environment variable
    if (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) {
        return process.env.REACT_APP_API_URL;
    }
    // Check for window variable (can be injected via script tag)
    if (window.API_BASE_URL) {
        return window.API_BASE_URL;
    }
    // Production API URL (Render)
    return 'https://twinner.onrender.com';
})();

// Helper function to get full API URL
function getApiUrl(endpoint) {
    // Remove leading slash if present
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    // Ensure no double slashes
    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    return `${baseUrl}/${cleanEndpoint}`;
}

// Expose globally
window.API_BASE_URL = API_BASE_URL;
window.getApiUrl = getApiUrl;

// Log for debugging
console.log('🔧 API Base URL configured:', API_BASE_URL);
