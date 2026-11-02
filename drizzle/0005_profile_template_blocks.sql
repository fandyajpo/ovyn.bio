ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "blocks" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "profile_templates" ADD COLUMN IF NOT EXISTS "blocks" jsonb DEFAULT '[]'::jsonb NOT NULL;
