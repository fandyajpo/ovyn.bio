ALTER TABLE "profiles" ADD COLUMN "blocks" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "profile_templates" ADD COLUMN "blocks" jsonb DEFAULT '[]'::jsonb NOT NULL;
