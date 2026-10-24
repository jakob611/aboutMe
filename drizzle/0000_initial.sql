CREATE TABLE "comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"author" varchar(100) NOT NULL,
	"email" varchar(200) DEFAULT '',
	"content" text NOT NULL,
	"approved" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"email" varchar(200) NOT NULL,
	"subject" varchar(200) DEFAULT '',
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"mime_type" varchar(120) NOT NULL,
	"size" integer NOT NULL,
	"description" text DEFAULT '',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(120) NOT NULL,
	"title_en" varchar(200) NOT NULL,
	"title_sl" varchar(200) NOT NULL,
	"summary_en" text NOT NULL,
	"summary_sl" text NOT NULL,
	"description_en" text NOT NULL,
	"description_sl" text NOT NULL,
	"category" varchar(60) NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"cover_image" varchar(500) DEFAULT '',
	"gallery" jsonb DEFAULT '[]'::jsonb,
	"link_url" varchar(500) DEFAULT '',
	"link_label" varchar(100) DEFAULT '',
	"repo_url" varchar(500) DEFAULT '',
	"featured" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "projects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(100) NOT NULL,
	"icon" varchar(60) NOT NULL,
	"title_en" varchar(200) NOT NULL,
	"title_sl" varchar(200) NOT NULL,
	"description_en" text NOT NULL,
	"description_sl" text NOT NULL,
	"price_from" varchar(60) DEFAULT '',
	"order_index" integer DEFAULT 0,
	CONSTRAINT "services_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;