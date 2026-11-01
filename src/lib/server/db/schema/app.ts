import { relations, sql } from 'drizzle-orm';
import {
	boolean,
	integer,
	index,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
	unique,
	uniqueIndex,
	uuid
} from 'drizzle-orm/pg-core';
import { user } from './neon-auth';

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
	'cancelled'
]);
export const paymentStatusEnum = pgEnum('payment_status', [
	'pending',
	'succeeded',
	'failed',
	'expired',
	'cancelled',
	'refunded'
]);

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
		theme: text('theme').notNull().default('default'),
		visibility: profileVisibilityEnum('visibility').notNull().default('public'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('profiles_slug_idx').on(t.slug)]
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
		avatarUrl: text('avatar_url'),
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
	name: text('name').notNull(),
	description: text('description'),
	/** Price in IDR (whole rupiah). Server-controlled only. */
	price: integer('price').notNull(),
	currency: text('currency').notNull().default('IDR'),
	active: boolean('active').notNull().default(false),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

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
