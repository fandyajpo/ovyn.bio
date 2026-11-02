ALTER TABLE "profiles" ADD COLUMN "username_color" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "background_texture" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "background_key" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "background_fixed" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "template_id" uuid;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_template_id_profile_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."profile_templates"("id") ON DELETE set null ON UPDATE no action;
