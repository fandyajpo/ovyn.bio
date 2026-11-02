ALTER TABLE "profiles" ADD COLUMN "audio_key" text;
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "cursor_key" text;
--> statement-breakpoint
CREATE TABLE "profile_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"label" text NOT NULL,
	"url" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"theme" text DEFAULT 'default' NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profile_links" ADD CONSTRAINT "profile_links_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "profile_templates" ADD CONSTRAINT "profile_templates_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "profile_links_user_sort_idx" ON "profile_links" USING btree ("user_id", "sort_order");
--> statement-breakpoint
CREATE INDEX "profile_templates_owner_created_idx" ON "profile_templates" USING btree ("owner_user_id", "created_at");
--> statement-breakpoint
CREATE INDEX "profile_templates_public_created_idx" ON "profile_templates" USING btree ("is_public", "created_at");