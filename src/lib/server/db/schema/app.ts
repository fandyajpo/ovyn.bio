import { relations, sql } from 'drizzle-orm';
import {
	boolean,
	date,
	integer,
	index,
	jsonb,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
	unique,
	uniqueIndex,
	uuid
} from 'drizzle-orm/pg-core';
import type { TemplateBlock } from '#lib/schemas/templates';
import { user } from './auth';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const profileVisibilityEnum = pgEnum('profile_visibility', ['public', 'private']);
export const guildVisibilityEnum = pgEnum('guild_visibility', ['public', 'private']);
export const guildStatusEnum = pgEnum('guild_status', ['active', 'disbanded']);
export const guildRoleEnum = pgEnum('guild_role', ['owner', 'officer', 'member']);
export const invitationStatusEnum = pgEnum('invitation_status', [
	'pending',
	'accepted',
	'rejected',
	'cancelled',
	'expired'
]);
export const orderStatusEnum = pgEnum('order_status', [
	'pending',
	'paid',
	'failed',
	'expired',
	'cancelled',
	'refunded'
]);
export const paymentStatusEnum = pgEnum('payment_status', [
	'pending',
	'succeeded',
	'failed',
	'expired',
	'cancelled',
	'refunded'
]);
export const cosmeticKindEnum = pgEnum('cosmetic_kind', ['frame', 'wallpaper', 'badge']);
export const productCategoryEnum = pgEnum('product_category', ['plan', 'cosmetic']);
export const planOverrideTierEnum = pgEnum('plan_override_tier', ['free', 'premium']);

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

export const profiles = pgTable(
	'profiles',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: text('user_id')
			.notNull()
			.unique()
			.references(() => user.id, { onDelete: 'cascade' }),
		slug: text('slug').notNull().unique(),
		displayName: text('display_name'),
		bio: text('bio'),
		avatarKey: text('avatar_key'),
		bannerKey: text('banner_key'),
		audioKey: text('audio_key'),
		cursorKey: text('cursor_key'),
		theme: text('theme').notNull().default('default'),
		/** Optional hex colour for the @handle on the public page. */
		usernameColor: text('username_color'),
		/** Built-in page texture id; 'none' leaves the surface plain. */
		backgroundTexture: text('background_texture').notNull().default('none'),
		backgroundKey: text('background_key'),
		backgroundFixed: boolean('background_fixed').notNull().default(true),
		/** Layout template currently applied to this page (FK lives in migration 0007). */
		templateId: uuid('template_id'),
		/** Ordered page blocks applied from a template; rendered on the public page. */
		blocks: jsonb('blocks').$type<TemplateBlock[]>().notNull().default(sql`'[]'::jsonb`),
		visibility: profileVisibilityEnum('visibility').notNull().default('public'),
		/** Self-described persona picked during onboarding. */
		persona: text('persona'),
		/** Where the account first heard about ovyn. */
		foundVia: text('found_via'),
		/** Set once onboarding is finished; a null value means it still runs. */
		onboardedAt: timestamp('onboarded_at', { withTimezone: true }),
		equippedFrameId: uuid('equipped_frame_id').references(() => cosmetics.id, { onDelete: 'set null' }),
		equippedWallpaperId: uuid('equipped_wallpaper_id').references(() => cosmetics.id, { onDelete: 'set null' }),
		equippedBadgeId: uuid('equipped_badge_id').references(() => cosmetics.id, { onDelete: 'set null' }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('profiles_slug_idx').on(t.slug)]
);

/**
 * Slugs a profile has used before. Old public URLs keep resolving through
 * these rows, and a freed slug stays reserved while its row exists — except
 * for the profile reclaiming it, which removes the row.
 */
export const profileSlugHistory = pgTable(
	'profile_slug_history',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		profileId: uuid('profile_id')
			.notNull()
			.references(() => profiles.id, { onDelete: 'cascade' }),
		slug: text('slug').notNull().unique(),
		changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('profile_slug_history_profile_idx').on(t.profileId)]
);

/** Social and custom links displayed on a public profile. */
export const profileLinks = pgTable(
	'profile_links',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
		provider: text('provider').notNull(),
		label: text('label').notNull(),
		url: text('url').notNull(),
		sortOrder: integer('sort_order').notNull().default(0),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('profile_links_user_sort_idx').on(t.userId, t.sortOrder)]
);

export const profileTemplates = pgTable(
	'profile_templates',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		ownerUserId: text('owner_user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		description: text('description'),
		theme: text('theme').notNull().default('default'),
		/** Ordered, editable page blocks composed in the template editor. */
		blocks: jsonb('blocks').$type<TemplateBlock[]>().notNull().default(sql`'[]'::jsonb`),
		isPublic: boolean('is_public').notNull().default(false),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		index('profile_templates_owner_created_idx').on(t.ownerUserId, t.createdAt),
		index('profile_templates_public_created_idx').on(t.isPublic, t.createdAt)
	]
);

/**
 * Manual plan override set by a platform admin. While a row exists it wins
 * over access derived from payments; deleting it falls back to purchases.
 */
export const planOverrides = pgTable('plan_overrides', {
	userId: text('user_id')
		.primaryKey()
		.references(() => user.id, { onDelete: 'cascade' }),
	tier: planOverrideTierEnum('tier').notNull(),
	note: text('note'),
	grantedByUserId: text('granted_by_user_id').references(() => user.id, { onDelete: 'set null' }),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

/** Signed-in profile analytics; deduplicated to one visitor per UTC date. */
export const profileViews = pgTable(
	'profile_views',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		profileUserId: text('profile_user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
		viewerUserId: text('viewer_user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
		viewedOn: date('viewed_on', { mode: 'string' }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		uniqueIndex('profile_views_daily_unique').on(t.profileUserId, t.viewerUserId, t.viewedOn),
		index('profile_views_profile_date_idx').on(t.profileUserId, t.viewedOn)
	]
);

export const discordAccounts = pgTable(
	'discord_accounts',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		discordId: text('discord_id').notNull().unique(),
		username: text('username').notNull(),
		globalName: text('global_name'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('discord_accounts_user_id_idx').on(t.userId)]
);

// ---------------------------------------------------------------------------
// Guilds
// ---------------------------------------------------------------------------

export const guilds = pgTable(
	'guilds',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		ownerId: text('owner_id')
			.notNull()
			.references(() => user.id, { onDelete: 'restrict' }),
		name: text('name').notNull(),
		slug: text('slug').notNull().unique(),
		description: text('description'),
		iconKey: text('icon_key'),
		bannerKey: text('banner_key'),
		visibility: guildVisibilityEnum('visibility').notNull().default('public'),
		status: guildStatusEnum('status').notNull().default('active'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('guilds_slug_idx').on(t.slug), index('guilds_owner_id_idx').on(t.ownerId)]
);

/**
 * CRITICAL: one guild per user.
 * user_id is the PRIMARY KEY, so a user can only ever have one membership row.
 */
export const guildMembers = pgTable(
	'guild_members',
	{
		userId: text('user_id')
			.primaryKey()
			.references(() => user.id, { onDelete: 'cascade' }),
		guildId: uuid('guild_id')
			.notNull()
			.references(() => guilds.id, { onDelete: 'cascade' }),
		role: guildRoleEnum('role').notNull().default('member'),
		joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('guild_members_guild_id_idx').on(t.guildId)]
);

export const guildInvitations = pgTable(
	'guild_invitations',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		guildId: uuid('guild_id')
			.notNull()
			.references(() => guilds.id, { onDelete: 'cascade' }),
		inviterId: text('inviter_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		inviteeId: text('invitee_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		status: invitationStatusEnum('status').notNull().default('pending'),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		acceptedAt: timestamp('accepted_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		index('guild_invitations_invitee_idx').on(t.inviteeId),
		// Partial unique index: at most one pending invitation per (guild, invitee).
		uniqueIndex('guild_invitations_pending_unique')
			.on(t.guildId, t.inviteeId)
			.where(sql`status = 'pending'`)
	]
);

// ---------------------------------------------------------------------------
// Billing
// ---------------------------------------------------------------------------

export const products = pgTable('products', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: text('name').notNull().unique(),
	description: text('description'),
	/** Price in IDR (whole rupiah). Server-controlled only. */
	price: integer('price').notNull(),
	currency: text('currency').notNull().default('IDR'),
	active: boolean('active').notNull().default(false),
	category: productCategoryEnum('category').notNull().default('plan'),
	/** Term in days: 30 for the monthly Premium plan; legacy plans may keep null. */
	durationDays: integer('duration_days'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

/**
 * Profile cosmetics - avatars frames, wallpapers, badges.
 * A cosmetic IS a product: it shares the product row's id 1:1, so the
 * existing checkout/webhook flow fulfils cosmetic purchases automatically.
 */
export const cosmetics = pgTable(
	'cosmetics',
	{
		/** Shared with the products row (cosmetic.id === product.id). */
		id: uuid('id')
			.primaryKey()
			.references(() => products.id, { onDelete: 'cascade' }),
		kind: cosmeticKindEnum('kind').notNull(),
		/** Bundled static asset path or Neon Object Storage key for the cosmetic image. */
		assetKey: text('asset_key').notNull(),
		/** Optional accent color used for preview/glow effects. */
		accentColor: text('accent_color'),
		/** Null means unlimited; limited drops cap total paid/owned units. */
		stockLimit: integer('stock_limit'),
		/** Optional sale deadline for a time-limited drop. */
		dropEndsAt: timestamp('drop_ends_at', { withTimezone: true }),
		/** Optional in-app reward price; avoids requiring DOKU for earned items. */
		pointsPrice: integer('points_price'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('cosmetics_kind_idx').on(t.kind)]
);

/** Cosmetic ownership. The composite PK prevents duplicate grants. */
export const userCosmetics = pgTable(
	'user_cosmetics',
	{
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		cosmeticId: uuid('cosmetic_id')
			.notNull()
			.references(() => cosmetics.id, { onDelete: 'cascade' }),
		acquiredAt: timestamp('acquired_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		primaryKey({ columns: [t.userId, t.cosmeticId] }),
		index('user_cosmetics_cosmetic_idx').on(t.cosmeticId)
	]
);

export const orders = pgTable(
	'orders',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		productId: uuid('product_id')
			.notNull()
			.references(() => products.id, { onDelete: 'restrict' }),
		amount: integer('amount').notNull(),
		currency: text('currency').notNull().default('IDR'),
		status: orderStatusEnum('status').notNull().default('pending'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('orders_user_id_idx').on(t.userId), index('orders_status_idx').on(t.status)]
);

/** One reward account per user; points are earned, non-cash shop credits. */
export const userRewards = pgTable('user_rewards', {
	userId: text('user_id').primaryKey().references(() => user.id, { onDelete: 'cascade' }),
	points: integer('points').notNull().default(0),
	streakCount: integer('streak_count').notNull().default(0),
	lastCheckinDate: date('last_checkin_date', { mode: 'string' }),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

/** Exactly one check-in per user per UTC day. */
export const dailyCheckins = pgTable(
	'daily_checkins',
	{
		userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
		checkinDate: date('checkin_date', { mode: 'string' }).notNull(),
		streakCount: integer('streak_count').notNull(),
		pointsEarned: integer('points_earned').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		primaryKey({ columns: [t.userId, t.checkinDate] }),
		index('daily_checkins_date_idx').on(t.checkinDate)
	]
);

/** Referral codes are stable per inviter; referral attribution is one-time per invitee. */
export const referralCodes = pgTable('referral_codes', {
	userId: text('user_id').primaryKey().references(() => user.id, { onDelete: 'cascade' }),
	code: text('code').notNull().unique(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const referrals = pgTable(
	'referrals',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		referrerId: text('referrer_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
		referredUserId: text('referred_user_id').notNull().unique().references(() => user.id, { onDelete: 'cascade' }),
		status: text('status').notNull().default('pending'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		rewardedAt: timestamp('rewarded_at', { withTimezone: true })
	},
	(t) => [index('referrals_referrer_idx').on(t.referrerId)]
);

export const payments = pgTable(
	'payments',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		orderId: uuid('order_id')
			.notNull()
			.unique()
			.references(() => orders.id, { onDelete: 'cascade' }),
		provider: text('provider').notNull().default('doku'),
		providerTransactionId: text('provider_transaction_id'),
		paymentMethod: text('payment_method').notNull(),
		/** Virtual account number shown to the customer. */
		paymentCode: text('payment_code'),
		expiresAt: timestamp('expires_at', { withTimezone: true }),
		paidAt: timestamp('paid_at', { withTimezone: true }),
		status: paymentStatusEnum('status').notNull().default('pending'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('payments_order_id_idx').on(t.orderId)]
);

/** Idempotency guard: provider_event_id is unique per provider. */
export const paymentEvents = pgTable(
	'payment_events',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		paymentId: uuid('payment_id')
			.notNull()
			.references(() => payments.id, { onDelete: 'cascade' }),
		providerEventId: text('provider_event_id').notNull(),
		eventType: text('event_type').notNull(),
		payload: text('payload').notNull(),
		processedAt: timestamp('processed_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		unique('payment_events_provider_event_id_unique').on(t.providerEventId),
		index('payment_events_payment_id_idx').on(t.paymentId)
	]
);

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

/**
 * One fixed window per limiter key, kept in the database so every serverless
 * instance counts the same requests.
 */
export const rateLimits = pgTable(
	'rate_limits',
	{
		key: text('key').primaryKey(),
		count: integer('count').notNull().default(1),
		windowStart: timestamp('window_start', { withTimezone: true }).notNull().defaultNow(),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull()
	},
	(t) => [index('rate_limits_expires_at_idx').on(t.expiresAt)]
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const profilesRelations = relations(profiles, ({ one }) => ({
	user: one(user, { fields: [profiles.userId], references: [user.id] })
}));

export const guildsRelations = relations(guilds, ({ one, many }) => ({
	owner: one(user, { fields: [guilds.ownerId], references: [user.id] }),
	members: many(guildMembers)
}));

export const guildMembersRelations = relations(guildMembers, ({ one }) => ({
	user: one(user, { fields: [guildMembers.userId], references: [user.id] }),
	guild: one(guilds, { fields: [guildMembers.guildId], references: [guilds.id] })
}));

export const guildInvitationsRelations = relations(guildInvitations, ({ one }) => ({
	guild: one(guilds, { fields: [guildInvitations.guildId], references: [guilds.id] }),
	inviter: one(user, { fields: [guildInvitations.inviterId], references: [user.id] }),
	invitee: one(user, { fields: [guildInvitations.inviteeId], references: [user.id] })
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
	user: one(user, { fields: [orders.userId], references: [user.id] }),
	product: one(products, { fields: [orders.productId], references: [products.id] }),
	payments: many(payments)
}));

export const paymentsRelations = relations(payments, ({ one, many }) => ({
	order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
	events: many(paymentEvents)
}));

export const productsRelations = relations(products, ({ many }) => ({
	orders: many(orders)
}));

export const paymentEventsRelations = relations(paymentEvents, ({ one }) => ({
	payment: one(payments, { fields: [paymentEvents.paymentId], references: [payments.id] })
}));

// ---------------------------------------------------------------------------
// Media storage
// ---------------------------------------------------------------------------

/**
 * Durable queue for object deletions that could not be verified inline (storage
 * hiccup, crash between the database commit and the delete). One row per object
 * key, unique, so enqueueing is idempotent and retries never double-delete.
 * Processing re-checks that the key is still unreferenced before deleting.
 */
export const mediaCleanupQueue = pgTable('media_cleanup_queue', {
	id: uuid('id').primaryKey().defaultRandom(),
	objectKey: text('object_key').notNull().unique(),
	status: text('status', { enum: ['pending', 'done', 'failed'] }).notNull().default('pending'),
	attempts: integer('attempts').notNull().default(0),
	lastError: text('last_error'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

// ---------------------------------------------------------------------------
// Runtime feature flags (admin "Manage auth")
// ---------------------------------------------------------------------------

/**
 * Admin-toggled switches for sign-in methods, read on every auth attempt
 * (with a short per-instance cache). Absent rows mean enabled, so a fresh
 * database never locks anyone out and the gate can never fail closed.
 */
export const featureFlags = pgTable('feature_flags', {
	key: text('key').primaryKey(),
	enabled: boolean('enabled').notNull().default(true),
	updatedBy: text('updated_by'),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});