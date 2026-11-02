CREATE TYPE "public"."product_category" AS ENUM('plan', 'cosmetic', 'profile_spotlight', 'guild_spotlight');--> statement-breakpoint
CREATE TYPE "public"."spotlight_target" AS ENUM('profile', 'guild');--> statement-breakpoint
CREATE TABLE "daily_checkins" (
	"user_id" text NOT NULL,
	"checkin_date" date NOT NULL,
	"streak_count" integer NOT NULL,
	"points_earned" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_checkins_user_id_checkin_date_pk" PRIMARY KEY("user_id","checkin_date")
);
--> statement-breakpoint
CREATE TABLE "profile_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_user_id" text NOT NULL,
	"viewer_user_id" text NOT NULL,
	"viewed_on" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_codes" (
	"user_id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referral_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referrer_id" text NOT NULL,
	"referred_user_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"rewarded_at" timestamp with time zone,
	CONSTRAINT "referrals_referred_user_id_unique" UNIQUE("referred_user_id")
);
--> statement-breakpoint
CREATE TABLE "spotlights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_type" "spotlight_target" NOT NULL,
	"target_id" text NOT NULL,
	"owner_user_id" text NOT NULL,
	"order_id" uuid NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "spotlights_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "user_rewards" (
	"user_id" text PRIMARY KEY NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"streak_count" integer DEFAULT 0 NOT NULL,
	"last_checkin_date" date,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cosmetics" ADD COLUMN "stock_limit" integer;--> statement-breakpoint
ALTER TABLE "cosmetics" ADD COLUMN "drop_ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "cosmetics" ADD COLUMN "points_price" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "target_type" "spotlight_target";--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "target_id" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "category" "product_category" DEFAULT 'plan' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "duration_days" integer;--> statement-breakpoint
ALTER TABLE "daily_checkins" ADD CONSTRAINT "daily_checkins_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_views" ADD CONSTRAINT "profile_views_profile_user_id_user_id_fk" FOREIGN KEY ("profile_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_views" ADD CONSTRAINT "profile_views_viewer_user_id_user_id_fk" FOREIGN KEY ("viewer_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_user_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_user_id_user_id_fk" FOREIGN KEY ("referred_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spotlights" ADD CONSTRAINT "spotlights_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spotlights" ADD CONSTRAINT "spotlights_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_rewards" ADD CONSTRAINT "user_rewards_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "daily_checkins_date_idx" ON "daily_checkins" USING btree ("checkin_date");--> statement-breakpoint
CREATE UNIQUE INDEX "profile_views_daily_unique" ON "profile_views" USING btree ("profile_user_id","viewer_user_id","viewed_on");--> statement-breakpoint
CREATE INDEX "profile_views_profile_date_idx" ON "profile_views" USING btree ("profile_user_id","viewed_on");--> statement-breakpoint
CREATE INDEX "referrals_referrer_idx" ON "referrals" USING btree ("referrer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "spotlights_target_unique" ON "spotlights" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "spotlights_expires_idx" ON "spotlights" USING btree ("expires_at");