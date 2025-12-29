import { pgTable, serial, text, json, boolean, timestamp } from "drizzle-orm/pg-core";

export const projects = pgTable('projects', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    type: text('type').notNull(),
    area: text('area').default('Sistemas'),
    modules: json('modules').default([]),
    createdAt: timestamp('created_at').defaultNow()
});

export const completedModules = pgTable('completed_modules', {
    id: serial('id').primaryKey(),
    moduleKey: text('module_key').notNull().unique(),
    completed: boolean('completed').default(false)
});

export const uploads = pgTable('uploads', {
    id: serial('id').primaryKey(),
    moduleKey: text('module_key').notNull().unique(),
    filename: text('filename').notNull(),
    originalName: text('original_name').notNull(),
    mimeType: text('mime_type'),
    cloudinaryUrl: text('cloudinary_url').notNull(),
    publicId: text('public_id').notNull(),
    createdAt: timestamp('created_at').defaultNow()
});
