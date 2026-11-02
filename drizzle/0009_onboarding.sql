ALTER TABLE "profiles" ADD COLUMN "persona" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "found_via" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "onboarded_at" timestamp with time zone;

--> statement-breakpoint
-- Accounts that existed before onboarding shipped keep their current start.
UPDATE "profiles" SET "onboarded_at" = now() WHERE "onboarded_at" IS NULL;
