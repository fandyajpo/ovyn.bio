CREATE TYPE "public"."plan_override_tier" AS ENUM('free', 'premium');--> statement-breakpoint
CREATE TABLE "plan_overrides" (
	"user_id" text PRIMARY KEY NOT NULL,
	"tier" "plan_override_tier" NOT NULL,
	"note" text,
	"granted_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plan_overrides" ADD CONSTRAINT "plan_overrides_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_overrides" ADD CONSTRAINT "plan_overrides_granted_by_user_id_user_id_fk" FOREIGN KEY ("granted_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
