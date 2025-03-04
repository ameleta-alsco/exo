const express = require('express');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const app = express();

// Enable CORS for all routes
app.use(cors());

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the root directory
app.use(express.static(path.join(__dirname, '..')));

// Log all requests for debugging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Add specific endpoint for pois.json
app.get('/api/pois-approved', (req, res) => {
    const filePath = path.join(__dirname, '../pois/pois.json');
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        console.error('pois.json file not found at:', filePath);
        res.status(404).json({ error: 'POIs file not found' });
    }
});

// Add echo endpoint
app.get('/pois/echo.json', (req, res) => {
    res.json({ status: 'OK' });
});

// Add specific endpoint for pois-draft.json
app.get('/api/pois-draft', (req, res) => {
    const filePath = path.join(__dirname, '../pois/pois-draft.json');
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        console.error('pois-draft.json file not found at:', filePath);
        res.status(404).json({ error: 'POIs draft file not found' });
    }
});

// Update file paths - ensure they exist
const POIS_FILE = path.join(__dirname, '../pois/pois.json');
const DRAFT_FILE = path.join(__dirname, '../pois/pois-draft.json');

// Ensure directories exist
const poisDir = path.dirname(POIS_FILE);
if (!fs.existsSync(poisDir)) {
    console.log(`Creating pois directory: ${poisDir}`);
    try {
        fs.mkdirSync(poisDir, { recursive: true });
        console.log('Successfully created pois directory');
    } catch (err) {
        console.error('Error creating pois directory:', err);
    }
}

// Initialize files if they don't exist
[POIS_FILE, DRAFT_FILE].forEach(file => {
    if (!fs.existsSync(file)) {
        console.log(`Creating file: ${file}`);
        try {
            fs.writeFileSync(file, '[]', 'utf8');
            console.log(`Successfully created file: ${file}`);
        } catch (err) {
            console.error(`Error creating file ${file}:`, err);
        }
    }
});

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({ message: 'Server is running!' });
});

// API endpoint to check pois directory
app.get('/api/check-pois', (req, res) => {
    const poisDir = path.join(__dirname, '../pois');
    const exists = fs.existsSync(poisDir);
    
    let files = [];
    if (exists) {
        try {
            files = fs.readdirSync(poisDir);
        } catch (err) {
            console.error('Error reading pois directory:', err);
        }
    }
    
    res.json({
        poisDirExists: exists,
        poisDirPath: poisDir,
        files: files,
        currentDir: __dirname,
        rootDir: path.join(__dirname, '..')
    });
});

// Health check endpoint for Azure
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

// Root endpoint - serve the HTML file instead of JSON response
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../default.html'));
});

// Endpoint to save POIs
app.post('/api/save-poi', (req, res) => {
    console.log('Received POI request:', req.body);

    const poi = req.body;
    const filePath = DRAFT_FILE;

    try {
        // Read existing POIs
        let pois = [];
        if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            if (fileContent) {
                pois = JSON.parse(fileContent);
            }
        }

        // Add new POI
        pois.push(poi);

        // Save back to file
        fs.writeFileSync(filePath, JSON.stringify(pois, null, 2));
        console.log('Successfully saved POI');
        res.json({ success: true });
    } catch (err) {
        console.error('Error handling POI save:', err);
        res.status(500).json({ error: 'Failed to save POI', details: err.message });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Start server
const PORT = process.env.PORT || 8080; // Azure Web Apps expects 8080
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Test the server by visiting http://localhost:${PORT}/api/test`);
    
    // Log directory structure for debugging
    console.log('Current directory:', __dirname);
    console.log('Root directory:', path.join(__dirname, '..'));
    
    // Check if pois directory exists
    const poisDir = path.join(__dirname, '../pois');
    console.log('Pois directory exists:', fs.existsSync(poisDir));
    
    // List files in pois directory if it exists
    if (fs.existsSync(poisDir)) {
        console.log('Files in pois directory:', fs.readdirSync(poisDir));
    }
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
}); 