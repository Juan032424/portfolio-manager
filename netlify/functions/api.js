import serverless from "serverless-http";
import express from "express";
import cors from "cors";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { Streamifier } from "streamifier";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { projects, completedModules, uploads } from "../../src/db/schema.js";
import { eq } from "drizzle-orm";

const app = express();
app.use(cors());
app.use(express.json());

// Database Connection
const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

// Cloudinary Config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer (Memory Storage for Serverless)
const upload = multer({ storage: multer.memoryStorage() });

// --- ROUTES ---

// GET Projects
app.get("/api/projects", async (req, res) => {
    try {
        const allProjects = await db.select().from(projects);
        res.json(allProjects);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST Project
app.post("/api/projects", async (req, res) => {
    try {
        const { name, type, area, modules } = req.body;
        const [newProject] = await db.insert(projects).values({
            name,
            type,
            area,
            modules: modules || []
        }).returning();
        res.json(newProject);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE Project
app.delete("/api/projects/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const result = await db.delete(projects).where(eq(projects.id, id)).returning();
        res.json({ deleted: result.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET Completed Status
app.get("/api/completed", async (req, res) => {
    try {
        // Return map: { moduleKey: true }
        const allCompleted = await db.select().from(completedModules);
        const map = {};
        allCompleted.forEach(c => {
            if (c.completed) map[c.moduleKey] = true;
        });
        res.json(map);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// TOGGLE Completed
app.post("/api/completed/toggle", async (req, res) => {
    try {
        const { moduleKey } = req.body;
        // Check if exists
        const existing = await db.select().from(completedModules).where(eq(completedModules.moduleKey, moduleKey));

        let newState = true;
        if (existing.length > 0) {
            newState = !existing[0].completed;
            await db.update(completedModules)
                .set({ completed: newState })
                .where(eq(completedModules.moduleKey, moduleKey));
        } else {
            await db.insert(completedModules).values({ moduleKey, completed: true });
        }

        res.json({ moduleKey, completed: newState });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET Uploads
app.get("/api/uploads", async (req, res) => {
    try {
        const allUploads = await db.select().from(uploads);
        const map = {};
        allUploads.forEach(u => {
            map[u.moduleKey] = {
                name: u.originalName,
                preview: u.cloudinaryUrl,
                type: u.mimeType
            };
        });
        res.json(map);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// UPLOAD File (Cloudinary)
app.post("/api/upload", upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const { moduleKey } = req.body;

    try {
        // 1. Upload to Cloudinary
        const b64 = Buffer.from(req.file.buffer).toString("base64");
        let dataURI = "data:" + req.file.mimetype + ";base64," + b64;

        // Upload promise
        const result = await cloudinary.uploader.upload(dataURI, {
            folder: "portfolio-manager",
            public_id: moduleKey + "_" + Date.now() // Unique ID
        });

        // 2. Save metadata to DB
        // Delete old if exists (logic omitted for brevity, but Cloudinary handles unique IDs ok)

        // Upsert logic roughly:
        const existing = await db.select().from(uploads).where(eq(uploads.moduleKey, moduleKey));
        if (existing.length > 0) {
            // Update
            await db.update(uploads).set({
                filename: result.public_id, // storing public_id as filename reference
                originalName: req.file.originalname,
                mimeType: req.file.mimetype,
                cloudinaryUrl: result.secure_url,
                publicId: result.public_id
            }).where(eq(uploads.moduleKey, moduleKey));
        } else {
            // Insert
            await db.insert(uploads).values({
                moduleKey,
                filename: result.public_id,
                originalName: req.file.originalname,
                mimeType: req.file.mimetype,
                cloudinaryUrl: result.secure_url,
                publicId: result.public_id
            });
        }

        res.json({
            moduleKey,
            file: {
                name: req.file.originalname,
                preview: result.secure_url,
                type: req.file.mimetype
            }
        });

    } catch (error) {
        console.error("Upload failed", error);
        res.status(500).json({ error: "Upload failed: " + error.message });
    }
});

// DELETE Upload
app.delete("/api/upload/:moduleKey", async (req, res) => {
    try {
        const { moduleKey } = req.params;
        const existing = await db.select().from(uploads).where(eq(uploads.moduleKey, moduleKey));

        if (existing.length > 0) {
            const fileRecord = existing[0];
            // Delete from Cloudinary
            await cloudinary.uploader.destroy(fileRecord.publicId);
            // Delete from DB
            await db.delete(uploads).where(eq(uploads.moduleKey, moduleKey));
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


export const handler = serverless(app);
