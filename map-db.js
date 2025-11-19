// SQLite Database Management for Geotagged Media
let db = null;
let SQL = null;

// Initialize SQLite database
async function initDatabase() {
    try {
        // Load SQL.js
        SQL = await initSqlJs({
            locateFile: file => `https://cdn.jsdelivr.net/npm/sql.js@1.8.0/dist/${file}`
        });

        // Try to load existing database from sessionStorage
        const savedDb = sessionStorage.getItem('twinner_db');
        
        if (savedDb) {
            const buffer = Uint8Array.from(atob(savedDb), c => c.charCodeAt(0));
            db = new SQL.Database(buffer);
        } else {
            // Create new database
            db = new SQL.Database();
            createTables();
        }

        console.log('Database initialized successfully');
        return true;
    } catch (error) {
        console.error('Error initializing database:', error);
        // Fallback: create in-memory database
        try {
            SQL = await initSqlJs();
            db = new SQL.Database();
            createTables();
            return true;
        } catch (e) {
            console.error('Failed to initialize database:', e);
            return false;
        }
    }
}

// Create database tables
function createTables() {
    const createMediaTable = `
        CREATE TABLE IF NOT EXISTS media (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            file_data TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            category TEXT NOT NULL,
            description TEXT,
            upload_date TEXT NOT NULL,
            file_type TEXT NOT NULL
        );
    `;

    const createLocationsTable = `
        CREATE TABLE IF NOT EXISTS locations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            address TEXT,
            media_count INTEGER DEFAULT 0
        );
    `;

    db.run(createMediaTable);
    db.run(createLocationsTable);
    saveDatabase();
}

// Save database to sessionStorage
function saveDatabase() {
    try {
        const data = db.export();
        const buffer = btoa(String.fromCharCode(...data));
        sessionStorage.setItem('twinner_db', buffer);
    } catch (error) {
        console.error('Error saving database:', error);
    }
}

// Insert media record
function insertMedia(filename, fileData, latitude, longitude, category, description, fileType) {
    const uploadDate = new Date().toISOString();
    const stmt = db.prepare(`
        INSERT INTO media (filename, file_data, latitude, longitude, category, description, upload_date, file_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run([filename, fileData, latitude, longitude, category, description || '', uploadDate, fileType]);
    stmt.free();
    
    // Update location count
    updateLocationCount(latitude, longitude);
    
    saveDatabase();
    return true;
}

// Update location media count
function updateLocationCount(latitude, longitude) {
    // Round coordinates to group nearby locations
    const roundedLat = Math.round(latitude * 1000) / 1000;
    const roundedLng = Math.round(longitude * 1000) / 1000;
    
    const checkStmt = db.prepare('SELECT id, media_count FROM locations WHERE latitude = ? AND longitude = ?');
    const result = checkStmt.get([roundedLat, roundedLng]);
    
    if (result) {
        const updateStmt = db.prepare('UPDATE locations SET media_count = media_count + 1 WHERE id = ?');
        updateStmt.run([result.id]);
        updateStmt.free();
    } else {
        const insertStmt = db.prepare('INSERT INTO locations (latitude, longitude, media_count) VALUES (?, ?, 1)');
        insertStmt.run([roundedLat, roundedLng]);
        insertStmt.free();
    }
    
    checkStmt.free();
}

// Get all media
function getAllMedia(categoryFilter = 'all') {
    let query = 'SELECT * FROM media';
    const params = [];
    
    if (categoryFilter !== 'all') {
        query += ' WHERE category = ?';
        params.push(categoryFilter);
    }
    
    query += ' ORDER BY upload_date DESC';
    
    const stmt = db.prepare(query);
    stmt.bind(params);
    
    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    
    stmt.free();
    return results;
}

// Get media by location
function getMediaByLocation(latitude, longitude, radius = 0.001) {
    const stmt = db.prepare(`
        SELECT * FROM media 
        WHERE ABS(latitude - ?) < ? AND ABS(longitude - ?) < ?
        ORDER BY upload_date DESC
    `);
    
    stmt.bind([latitude, radius, longitude, radius]);
    
    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    
    stmt.free();
    return results;
}

// Get grouped locations
function getGroupedLocations(categoryFilter = 'all') {
    let query = `
        SELECT 
            ROUND(latitude, 3) as lat,
            ROUND(longitude, 3) as lng,
            category,
            COUNT(*) as count
        FROM media
    `;
    
    const params = [];
    if (categoryFilter !== 'all') {
        query += ' WHERE category = ?';
        params.push(categoryFilter);
    }
    
    query += ' GROUP BY lat, lng, category';
    
    const stmt = db.prepare(query);
    stmt.bind(params);
    
    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    
    stmt.free();
    return results;
}

// Delete media
function deleteMedia(id) {
    const stmt = db.prepare('DELETE FROM media WHERE id = ?');
    stmt.run([id]);
    stmt.free();
    saveDatabase();
}

// Export database as JSON
window.exportData = function() {
    const media = getAllMedia();
    const dataStr = JSON.stringify(media, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `twinner-export-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
}

