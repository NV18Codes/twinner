const express = require('express');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const ExifImage = require('exif').ExifImage;

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
// CORS configuration - handle preflight and actual requests
// IMPORTANT: Handle CORS before other middleware to catch OPTIONS requests
app.use((req, res, next) => {
    const origin = req.headers.origin;
    
    // Allow all origins for now (can restrict later)
    if (origin) {
        res.header('Access-Control-Allow-Origin', origin);
    } else {
        res.header('Access-Control-Allow-Origin', '*');
    }
    
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours
    
    // Handle preflight requests (OPTIONS)
    if (req.method === 'OPTIONS') {
        console.log('✅ CORS preflight request handled for origin:', origin);
        return res.sendStatus(200);
    }
    
    next();
});

// Also use cors middleware as backup
app.use(cors({
    origin: true, // Allow all origins
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from root directory (for frontend)
app.use(express.static(__dirname));

// Serve .well-known for Chrome DevTools
app.use('/.well-known', express.static(path.join(__dirname, 'public', '.well-known')));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'TWINNER API is running' });
});

// Configure multer for file uploads
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Initialize SQLite database
const dbPath = path.join(__dirname, 'twinner.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

// Initialize database tables
function initializeDatabase() {
    db.serialize(() => {
        // Media table
        db.run(`CREATE TABLE IF NOT EXISTS media (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            file_data TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            category TEXT NOT NULL,
            description TEXT,
            file_type TEXT NOT NULL,
            upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            user_id TEXT
        )`);

        // Locations table (for grouping)
        db.run(`CREATE TABLE IF NOT EXISTS locations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            category TEXT NOT NULL,
            media_count INTEGER DEFAULT 1,
            UNIQUE(latitude, longitude, category)
        )`);

        // Users table (for authentication)
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Sessions table
        db.run(`CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            session_token TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`);

        console.log('Database tables initialized');
    });
}

// Helper: Extract EXIF GPS data from image
function extractGPSFromImage(filePath) {
    return new Promise((resolve, reject) => {
        try {
            new ExifImage({ image: filePath }, (error, exifData) => {
                if (error) {
                    reject(error);
                    return;
                }

                const gps = exifData.gps;
                if (gps && gps.GPSLatitude && gps.GPSLongitude) {
                    // Convert DMS to decimal degrees
                    const lat = convertDMSToDD(
                        gps.GPSLatitude,
                        gps.GPSLatitudeRef || 'N'
                    );
                    const lng = convertDMSToDD(
                        gps.GPSLongitude,
                        gps.GPSLongitudeRef || 'E'
                    );
                    resolve({ latitude: lat, longitude: lng });
                } else {
                    reject(new Error('No GPS data in EXIF'));
                }
            });
        } catch (error) {
            reject(error);
        }
    });
}

// Convert DMS to Decimal Degrees
function convertDMSToDD(dms, ref) {
    let dd = dms[0] + dms[1] / 60 + dms[2] / (60 * 60);
    if (ref === 'S' || ref === 'W') {
        dd = dd * -1;
    }
    return dd;
}

// Helper: Convert file to base64
function fileToBase64(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    return fileBuffer.toString('base64');
}

// Helper: Generate session token
function generateToken() {
    return require('crypto').randomBytes(32).toString('hex');
}

// ==================== AUTHENTICATION ENDPOINTS ====================

// Register
app.post('/api/auth/register', async (req, res) => {
    console.log('📝 Registration attempt received');
    console.log('Request body:', { email: req.body.email, password: req.body.password ? '***' : 'missing' });
    
    const { email, password } = req.body;

    if (!email || !password) {
        console.log('❌ Registration failed: Missing email or password');
        return res.status(400).json({ error: 'Email and password required' });
    }

    if (password.length < 6) {
        console.log('❌ Registration failed: Password too short');
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    console.log('✅ Validating email format and hashing password...');
    const bcrypt = require('bcrypt');
    const passwordHash = await bcrypt.hash(password, 10);

    db.run(
        'INSERT INTO users (email, password_hash) VALUES (?, ?)',
        [email, passwordHash],
        function(err) {
            if (err) {
                console.error('❌ Registration error:', err);
                if (err.message.includes('UNIQUE')) {
                    return res.status(409).json({ error: 'Email already exists' });
                }
                return res.status(500).json({ error: err.message });
            }

            console.log('✅ User registered successfully, ID:', this.lastID, 'Email:', email);
            res.json({
                message: 'User registered successfully',
                user_id: this.lastID,
                email: email
            });
        }
    );
});

// Login
app.post('/api/auth/login', async (req, res) => {
    console.log('🔐 Login attempt received');
    console.log('Request body:', { email: req.body.email, password: req.body.password ? '***' : 'missing' });
    
    const { email, password } = req.body;

    if (!email || !password) {
        console.log('❌ Login failed: Missing email or password');
        return res.status(400).json({ error: 'Email and password required' });
    }

    db.get(
        'SELECT * FROM users WHERE email = ?',
        [email],
        async (err, user) => {
            if (err) {
                console.error('❌ Database error during login:', err);
                return res.status(500).json({ error: err.message });
            }

            if (!user) {
                console.log('❌ Login failed: User not found for email:', email);
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            console.log('✅ User found, verifying password...');
            const bcrypt = require('bcrypt');
            const valid = await bcrypt.compare(password, user.password_hash);

            if (!valid) {
                console.log('❌ Login failed: Invalid password for email:', email);
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            
            console.log('✅ Password valid, creating session...');

            // Create session
            const token = generateToken();
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

            db.run(
                'INSERT INTO sessions (user_id, session_token, expires_at) VALUES (?, ?, ?)',
                [user.id, token, expiresAt.toISOString()],
                (err) => {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }

                    res.json({
                        message: 'Login successful',
                        token: token,
                        user: {
                            id: user.id,
                            email: user.email
                        }
                    });
                }
            );
        }
    );
});

// Verify token middleware
function verifyToken(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    db.get(
        'SELECT s.*, u.email FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.session_token = ? AND s.expires_at > datetime("now")',
        [token],
        (err, session) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            if (!session) {
                return res.status(401).json({ error: 'Invalid or expired token' });
            }

            req.user = {
                id: session.user_id,
                email: session.email
            };
            next();
        }
    );
}

// Verify token
app.get('/api/auth/verify', verifyToken, (req, res) => {
    res.json({
        valid: true,
        user: {
            id: req.user.id,
            email: req.user.email
        }
    });
});

// Logout
app.post('/api/auth/logout', verifyToken, (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');

    db.run(
        'DELETE FROM sessions WHERE session_token = ?',
        [token],
        (err) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.json({ message: 'Logout successful' });
        }
    );
});

// ==================== MEDIA ENDPOINTS ====================

// Upload media
app.post('/api/media/upload', verifyToken, upload.single('media'), async (req, res) => {
    try {
        const { category, description } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        if (!category) {
            return res.status(400).json({ error: 'Category required' });
        }

        let latitude, longitude;
        const isImage = file.mimetype.startsWith('image/');
        const isVideo = file.mimetype.startsWith('video/');

        // For images: Try to extract GPS from EXIF
        if (isImage) {
            try {
                const gps = await extractGPSFromImage(file.path);
                latitude = gps.latitude;
                longitude = gps.longitude;
            } catch (error) {
                // If no EXIF, try manual coordinates
                latitude = parseFloat(req.body.latitude);
                longitude = parseFloat(req.body.longitude);

                if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
                    fs.unlinkSync(file.path);
                    return res.status(400).json({
                        error: 'No GPS data in image EXIF. Please provide latitude and longitude.'
                    });
                }
            }
        } 
        // For videos: Always require manual coordinates (videos don't have EXIF GPS)
        else if (isVideo) {
            latitude = parseFloat(req.body.latitude);
            longitude = parseFloat(req.body.longitude);

            if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
                fs.unlinkSync(file.path);
                return res.status(400).json({
                    error: 'Videos do not contain GPS data. Please provide latitude and longitude.'
                });
            }
        } else {
            fs.unlinkSync(file.path);
            return res.status(400).json({ error: 'Unsupported file type. Only images and videos are allowed.' });
        }

        // Convert file to base64
        const fileData = fileToBase64(file.path);
        const fileType = isImage ? 'image' : 'video';

        console.log('Inserting media into database:', {
            filename: file.originalname,
            category,
            latitude,
            longitude,
            user_id: req.user.id
        });

        // Insert media
        db.run(
            `INSERT INTO media (filename, file_data, latitude, longitude, category, description, file_type, user_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [file.originalname, fileData, latitude, longitude, category, description || null, fileType, req.user.id],
            function(err) {
                if (err) {
                    console.error('Database insert error:', err);
                    fs.unlinkSync(file.path);
                    return res.status(500).json({ error: err.message });
                }

                console.log('✅ Media inserted successfully, ID:', this.lastID);
                console.log('📊 Database now has media with ID:', this.lastID);

                // Update location count
                db.run(
                    `INSERT OR REPLACE INTO locations (latitude, longitude, category, media_count)
                     VALUES (?, ?, ?, 
                        COALESCE((SELECT media_count FROM locations WHERE latitude = ? AND longitude = ? AND category = ?), 0) + 1)`,
                    [latitude, longitude, category, latitude, longitude, category],
                    (err) => {
                        if (err) {
                            console.error('Location update error:', err);
                        } else {
                            console.log('✅ Location count updated');
                        }
                    }
                );

                // Delete temp file
                fs.unlinkSync(file.path);

                console.log('✅ Upload complete - returning success response');
                console.log('📍 Returning location:', { latitude, longitude });
                res.json({
                    message: 'Media uploaded successfully',
                    media_id: this.lastID,
                    location: { 
                        latitude: parseFloat(latitude), 
                        longitude: parseFloat(longitude) 
                    }
                });
            }
        );
    } catch (error) {
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: error.message });
    }
});

// Get all media (with optional category filter)
// ALL users (authenticated or not) see ALL media from the shared database
app.get('/api/media', (req, res) => {
    const { category } = req.query;
    const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;
    
    // Check if user is authenticated (for logging purposes only)
    if (token) {
        db.get(
            'SELECT s.*, u.email FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.session_token = ? AND s.expires_at > datetime("now")',
            [token],
            (err, session) => {
                if (session) {
                    console.log(`GET /api/media - Authenticated user: ${session.email} (ID: ${session.user_id}) - Showing ALL media`);
                } else {
                    console.log('GET /api/media - Public access (no valid token) - Showing ALL media');
                }
                // Always show all media regardless of authentication
                getPublicMedia(category, res);
            }
        );
    } else {
        console.log('GET /api/media - Public access (no token) - Showing ALL media');
        // Show all media (public)
        getPublicMedia(category, res);
    }
});

// Helper function to get all public media
function getPublicMedia(category, res) {
    let query = 'SELECT * FROM media';
    const params = [];

    if (category && category !== 'all') {
        query += ' WHERE category = ?';
        params.push(category);
    }

    query += ' ORDER BY upload_date DESC';

    console.log('GET /api/media (public) - Query:', query, 'Params:', params);

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: err.message });
        }

        console.log(`Returning ${rows.length} media items (public/all)`);
        res.json({ media: rows });
    });
}

// Get media by location
// ALL users (authenticated or not) see ALL media at the location from the shared database
app.get('/api/media/location', (req, res) => {
    const { lat, lng, category } = req.query;
    const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;

    if (!lat || !lng) {
        return res.status(400).json({ error: 'Latitude and longitude required' });
    }

    // Check if user is authenticated (for logging purposes only)
    if (token) {
        db.get(
            'SELECT s.*, u.email FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.session_token = ? AND s.expires_at > datetime("now")',
            [token],
            (err, session) => {
                if (session) {
                    console.log(`GET /api/media/location - Authenticated user: ${session.email} (ID: ${session.user_id}) - Showing ALL media at location`);
                } else {
                    console.log('GET /api/media/location - Public access (no valid token) - Showing ALL media at location');
                }
                // Always show all media at this location regardless of authentication
                getPublicMediaByLocation(lat, lng, category, res);
            }
        );
    } else {
        console.log('GET /api/media/location - Public access (no token) - Showing ALL media at location');
        // Show all media at this location (public)
        getPublicMediaByLocation(lat, lng, category, res);
    }
});

// Helper function to get all public media by location
function getPublicMediaByLocation(lat, lng, category, res) {
    let query = `SELECT * FROM media WHERE 
                 ABS(latitude - ?) < 0.001 AND ABS(longitude - ?) < 0.001`;
    const params = [parseFloat(lat), parseFloat(lng)];

    if (category && category !== 'all') {
        query += ' AND category = ?';
        params.push(category);
    }

    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        res.json({ media: rows });
    });
}

// Get grouped locations
app.get('/api/locations', (req, res) => {
    const { category } = req.query;
    let query = 'SELECT * FROM locations';
    const params = [];

    if (category && category !== 'all') {
        query += ' WHERE category = ?';
        params.push(category);
    }

    query += ' ORDER BY media_count DESC';

    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        res.json({ locations: rows });
    });
});

// Delete media
app.delete('/api/media/:id', verifyToken, (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM media WHERE id = ? AND user_id = ?', [id, req.user.id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (this.changes === 0) {
            return res.status(404).json({ error: 'Media not found or unauthorized' });
        }

        res.json({ message: 'Media deleted successfully' });
    });
});

// ==================== EXPORT DATA ====================

app.get('/api/export', verifyToken, (req, res) => {
    db.all('SELECT * FROM media WHERE user_id = ?', [req.user.id], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        res.json({ data: rows });
    });
});

// Serve index.html for root (SPA fallback)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve map.html for /map route
app.get('/map.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'map.html'));
});

// 404 handler for API endpoints
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
});

// 404 handler for other routes
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 TWINNER API Server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`📝 API Documentation: See README_API.md`);
});

