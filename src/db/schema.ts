import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  varchar,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import type { ProjectGallery } from "@/lib/project-media";

// ---------- Projects ----------
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  titleEn: varchar("title_en", { length: 200 }).notNull(),
  titleSl: varchar("title_sl", { length: 200 }).notNull(),
  summaryEn: text("summary_en").notNull(),
  summarySl: text("summary_sl").notNull(),
  descriptionEn: text("description_en").notNull(),
  descriptionSl: text("description_sl").notNull(),
  category: varchar("category", { length: 60 }).notNull(), // 'android' | 'lego' | 'web' | 'other'
  tags: jsonb("tags").$type<string[]>().default([]),
  coverImage: varchar("cover_image", { length: 500 }).default(""),
  gallery: jsonb("gallery").$type<ProjectGallery>().default([]),
  linkUrl: varchar("link_url", { length: 500 }).default(""),
  linkLabel: varchar("link_label", { length: 100 }).default(""),
  repoUrl: varchar("repo_url", { length: 500 }).default(""),
  featured: boolean("featured").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------- Comments (under a project) ----------
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  author: varchar("author", { length: 100 }).notNull(),
  email: varchar("email", { length: 200 }).default(""),
  content: text("content").notNull(),
  approved: boolean("approved").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------- Public file downloads ----------
export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 120 }).notNull(),
  size: integer("size").notNull(),
  description: text("description").default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------- Services you offer ----------
export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  icon: varchar("icon", { length: 60 }).notNull(),
  titleEn: varchar("title_en", { length: 200 }).notNull(),
  titleSl: varchar("title_sl", { length: 200 }).notNull(),
  descriptionEn: text("description_en").notNull(),
  descriptionSl: text("description_sl").notNull(),
  priceFrom: varchar("price_from", { length: 60 }).default(""),
  orderIndex: integer("order_index").default(0),
});

// ---------- Contact submissions ----------
export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 200 }).notNull(),
  subject: varchar("subject", { length: 200 }).default(""),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
