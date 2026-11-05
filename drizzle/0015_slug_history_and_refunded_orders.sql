ALTER TYPE "order_status" ADD VALUE 'refunded';
--> statement-breakpoint
CREATE TABLE "profile_slug_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_slug_history_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE
);
--> statement-breakpoint
ALTER TABLE "profile_slug_history" ADD CONSTRAINT "profile_slug_history_slug_unique" UNIQUE("slug");
--> statement-breakpoint
CREATE INDEX "profile_slug_history_profile_idx" ON "profile_slug_history" USING btree ("profile_id");