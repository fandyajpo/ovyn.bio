CREATE TYPE "public"."cosmetic_kind" AS ENUM('frame', 'wallpaper', 'badge');--> statement-breakpoint
CREATE TABLE "cosmetics" (
	"id" uuid PRIMARY KEY NOT NULL,
	"kind" "cosmetic_kind" NOT NULL,
	"asset_key" text NOT NULL,
	"accent_color" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_cosmetics" (
	"user_id" text NOT NULL,
	"cosmetic_id" uuid NOT NULL,
	"acquired_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_cosmetics_user_id_cosmetic_id_pk" PRIMARY KEY("user_id","cosmetic_id")
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "equipped_frame_id" uuid;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "equipped_wallpaper_id" uuid;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "equipped_badge_id" uuid;--> statement-breakpoint
ALTER TABLE "cosmetics" ADD CONSTRAINT "cosmetics_id_products_id_fk" FOREIGN KEY ("id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_cosmetics" ADD CONSTRAINT "user_cosmetics_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_cosmetics" ADD CONSTRAINT "user_cosmetics_cosmetic_id_cosmetics_id_fk" FOREIGN KEY ("cosmetic_id") REFERENCES "public"."cosmetics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cosmetics_kind_idx" ON "cosmetics" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "user_cosmetics_cosmetic_idx" ON "user_cosmetics" USING btree ("cosmetic_id");--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_equipped_frame_id_cosmetics_id_fk" FOREIGN KEY ("equipped_frame_id") REFERENCES "public"."cosmetics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_equipped_wallpaper_id_cosmetics_id_fk" FOREIGN KEY ("equipped_wallpaper_id") REFERENCES "public"."cosmetics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_equipped_badge_id_cosmetics_id_fk" FOREIGN KEY ("equipped_badge_id") REFERENCES "public"."cosmetics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_name_unique" UNIQUE("name");