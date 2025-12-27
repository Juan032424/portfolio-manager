const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3005;

// Middleware
app.use(cors());
app.use(express.json());

// Static folder for uploaded files
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
app.use('/uploads', express.static(uploadDir));

// Multer Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Unique filename: timestamp + originalname
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// --- JSON FILE DATABASE IMPLEMENTATION ---
const DATA_FILE = path.join(__dirname, 'data.json');

// In-memory data store
let db = {
    projects: [],
    completedModules: {}, // Map: "moduleKey" -> boolean
    uploads: {}           // Map: "moduleKey" -> fileObject
};

// Load data from file or initialize
function loadData() {
    if (fs.existsSync(DATA_FILE)) {
        try {
            const fileData = fs.readFileSync(DATA_FILE, 'utf8');
            db = JSON.parse(fileData);
            console.log('Data loaded from data.json');
        } catch (err) {
            console.error('Error reading data.json:', err);
            // If error, keep default db
        }
    } else {
        console.log('No data.json found. Creating new one with seed data...');
        seedData();
        saveData();
    }
}

// Save data to file
function saveData() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf8');
        // console.log('Data saved to data.json');
    } catch (err) {
        console.error('Error writing data.json:', err);
    }
}

// Seed Initial Data
function seedData() {
    db.projects = [
        {
            id: 1,
            name: "Sistema Integral de Gestión de Análisis Empresarial",
            type: "REPORTE",
            area: "Sistemas",
            modules: ["MODULO DE FACTURACION", "MODULO DE CIERRE OPERATIVO", "MODULO DE NUMEROS DE CARTERA"]
        },
        {
            id: 2,
            name: "Proyecto SENCILLO",
            type: "REPORTE",
            area: "Analistas",
            modules: ["MODULO DE (SUSPENSIONES PRIMERA VEZ)", "MODULO DE (BANCO DE SEGUNDO RANGO)"]
        },
        {
            id: 3,
            name: "Proyecto Nuevas Acometidas y Almacen",
            type: "REPORTE",
            area: "Soporte",
            modules: ["MODULO DE (PRODUCCION NUEVAS ACOMETIDAS)", "MODULO DE ALMACEN (RECUENTO DE MATERIALES Y PROCESOS)"]
        },
        {
            id: 4,
            name: "INVENTORYPRO - SISTEMA DE CONTROL DE MATERIALES",
            type: "SISTEMA",
            area: "Desarrollo",
            modules: []
        },
        {
            id: 5,
            name: "Admiistrativo",
            type: "REPORTE",
            area: "Auxiliares",
            modules: ["DASHBOARD DE CONTROL DE CREDITOS", "DESARROLLO DEL SICC (SISTEMA INTEGRAL DE CONTROL DE CREDITOS)"]
        },
        {
            id: 6,
            name: "Proyecto Gases del caribe",
            type: "REPORTE",
            area: "Sistemas",
            modules: ["MODULO DE (ORDENES)", "MODULO DE (PERIODOS)", "MODULO DE (GESTION OPERATIVA Y DESEMPEÑO DE GESTORES)", "MODULO DE (ANALISIS DE PRODUCCION Y FACTURACION)", "MODULO DE (CAUSALES)", "MODULO DE (FACTURACION)", "MODULO DE (CIERRE OPERATIVO)"]
        }
    ];
}

// Initialize
loadData();


// --- API ROUTES ---

// GET Projects
app.get('/api/projects', (req, res) => {
    res.json(db.projects);
});

// POST Project
app.post('/api/projects', (req, res) => {
    const { name, type, area, modules } = req.body;

    // Generate simple ID (max id + 1)
    const maxId = db.projects.reduce((max, p) => (p.id > max ? p.id : max), 0);
    const newProject = {
        id: maxId + 1,
        name,
        type,
        area: area || 'Sistemas',
        modules: modules || []
    };

    db.projects.push(newProject);
    saveData();
    res.json(newProject);
});

// DELETE Project
app.delete('/api/projects/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const initialLength = db.projects.length;
    db.projects = db.projects.filter(p => p.id !== id);

    if (db.projects.length < initialLength) {
        saveData();
        res.json({ deleted: 1 });
    } else {
        res.json({ deleted: 0 });
    }
});

// GET Completed Status
app.get('/api/completed', (req, res) => {
    res.json(db.completedModules);
});

// TOGGLE Completed
app.post('/api/completed/toggle', (req, res) => {
    const { moduleKey } = req.body;

    // Toggle boolean
    const currentStatus = !!db.completedModules[moduleKey];
    db.completedModules[moduleKey] = !currentStatus;

    saveData();
    res.json({ moduleKey, completed: db.completedModules[moduleKey] });
});

// GET Uploads
app.get('/api/uploads', (req, res) => {
    // Transform struct for frontend if needed, but keeping it simple:
    // Frontend expects map of { name, preview, type }
    const responseMap = {};
    for (const [key, fileData] of Object.entries(db.uploads)) {
        responseMap[key] = {
            name: fileData.original_name,
            preview: `http://localhost:${PORT}/uploads/${fileData.filename}`,
            type: fileData.mime_type
        };
    }
    res.json(responseMap);
});

// UPLOAD File
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const { moduleKey } = req.body;

    // Remove old file if exists (optional logic)
    const oldFile = db.uploads[moduleKey];
    if (oldFile) {
        const oldPath = path.join(uploadDir, oldFile.filename);
        if (fs.existsSync(oldPath)) {
            try {
                fs.unlinkSync(oldPath);
            } catch (e) {
                console.error("Failed to delete old file:", e);
            }
        }
    }

    // Save metadata
    db.uploads[moduleKey] = {
        filename: req.file.filename,
        original_name: req.file.originalname,
        mime_type: req.file.mimetype,
        size: req.file.size,
        uploadDate: new Date().toISOString()
    };
    saveData();

    res.json({
        moduleKey,
        file: {
            name: req.file.originalname,
            preview: `http://localhost:${PORT}/uploads/${req.file.filename}`,
            type: req.file.mimetype
        }
    });
});

// DELETE Upload
app.delete('/api/upload/:moduleKey', (req, res) => {
    const { moduleKey } = req.params;
    const fileData = db.uploads[moduleKey];

    if (fileData) {
        // Delete from disk
        const filePath = path.join(uploadDir, fileData.filename);
        if (fs.existsSync(filePath)) {
            fs.unlink(filePath, (err) => {
                if (err) console.error("Failed to delete file from disk:", err);
            });
        }

        // Remove from db
        delete db.uploads[moduleKey];
        saveData();
    }

    res.json({ success: true });
});


app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
