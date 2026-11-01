# OVYN

**Your identity. Your circle.** — a digital identity and community platform at `ovyn.bio`.

Personal profiles, guild discovery, and membership with one strict rule: **one guild per user**.

## Stack

| Layer | Choice |
|---|---|
| Framework | SvelteKit 3 + Svelte 5 (runes) + TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Hosting | Vercel (`@sveltejs/adapter-vercel`, Node runtime) |
| Database | Neon PostgreSQL (pooled connection for app, direct for migrations) |
| ORM | Drizzle ORM |
| Auth | Standalone Better Auth — Discord OAuth only (configured in this app) |
| Storage | Neon Object Storage (S3-compatible, presigned uploads) |
| Payments | DOKU Direct API (SNAP, server-side only) |
| Client data | TanStack Query (checkout status polling) |
| Validation | Zod 4 |

Note on SvelteKit 3: configuration lives in `vite.config.ts` (via the
`sveltekit()` plugin options — there is no `svelte.config.js`), imports use the
`#lib/*` subpath alias declared in `package.json`, and `$app/env/*` replaces the
old `$env/*` modules. Server-only modules read `process.env` directly, which
works unchanged on Vercel Functions.

## Getting started

```bash
npm install
cp .env.example .env   # fill in the values below
npm run db:generate    # generate SQL migrations from the schema
npm run db:migrate     # apply them (uses DATABASE_URL directly)
npm run dev
```

## Environment variables

Already provisioned for you (see `.env.example`):

- `DATABASE_URL`, `DATABASE_URL_POOLED` — Neon PostgreSQL
- `AWS_ENDPOINT_URL_S3`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET` — Neon Object Storage
- `DOKU_CLIENT_ID`, `DOKU_SECRET_KEY`, `DOKU_API_KEY` — DOKU

You must add:

- `BETTER_AUTH_SECRET` — signing secret for sessions: `openssl rand -base64 32`
- `BETTER_AUTH_URL` — the exact origin your app runs on: `http://localhost:5173`
  locally, `https://ovyn.bio` in production (also set it in Vercel)
- `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` — from the Discord Developer
  Portal. In your Discord app → OAuth2 → Redirects, add:
  - `http://localhost:5173/api/auth/callback/discord` (dev)
  - `https://ovyn.bio/api/auth/callback/discord` (production)
- `DOKU_PRIVATE_KEY` — the RSA private key DOKU gives you for SNAP B2B token
  requests (`X-SIGNATURE = SHA256withRSA(privateKey, clientID + "|" + timestamp)`)
- `DOKU_PARTNER_SERVICE_ID` — your 8-digit virtual account company code (BIN)
- `DOKU_ENV=production` (optional; sandbox is the default), `DOKU_BASE_URL` (optional override)

## Key architecture notes

- **Auth** is standalone Better Auth (`src/lib/server/auth`) with Discord
  OAuth as the only sign-in method (`identify` scope, no email/password).
  It stores users/sessions/OAuth accounts in our own `user`, `session`,
  `account`, `verification` tables via the Drizzle adapter, runs the catch-all
  `/api/auth/[...all]` route, and populates `locals.user` in the server hook.
  Discord accounts without an email get a stable `<discord-id>@discord.ovyn.bio`
  placeholder via `mapProfileToUser`. Duplicate accounts for the same Discord
  ID are prevented by the unique `(provider, accountId)` pairing.
- **Coming from Neon Managed Auth?** After `npm run db:migrate`, run the
  one-time data backfill with `npm run db:backfill` — it copies users and
  Discord accounts from the managed `neon_auth` schema into the standalone
  tables with the SAME user ids, so profiles, guild memberships, and orders
  keep working. It's idempotent (safe to re-run). Do not disable Neon Managed
  Auth or drop `neon_auth` until sign-in is verified.
  (Prefer raw SQL? The same statements are in `scripts/backfill-better-auth.sql`.)
- **One guild per user** is enforced three ways: `guild_members.user_id`
  PRIMARY KEY, a `SELECT … FOR UPDATE` lock on the user row inside a
  transaction, and explicit conflict errors with user-facing explanations.
- **Payments** never touch the client: order amounts come from the products
  table, DOKU is called from server endpoints only, webhook signatures are
  verified against the raw body, and events are idempotent via unique
  `provider_event_id`. Terminal payment states never regress.
- **Uploads** use presigned PUTs to Neon Object Storage; keys are
  server-generated and namespaced per user, and ownership is re-verified when
  a key is attached to a profile.
- **Shop & cosmetics** — cosmetic items (avatar frames, wallpapers, badges)
  are products: buying one through the normal DOKU checkout grants it
  automatically via the payment webhook (fulfilment is idempotent). Users
  equip/unequip owned cosmetics in profile settings; public profiles render
  frames around the avatar, wallpapers behind the header, and badges next to
  the name. Seed the catalog with `npm run db:seed-shop`, then upload the
  art files to Neon Object Storage at the `cosmetics/<kind>/<name>.png` keys.

- **Limited drops** — cosmetics may have a stock cap and closing date. Stock is reserved during checkout and points redemption; expired 24-hour checkouts stop reserving units. Starter data includes one sample limited cosmetic.
- **Daily check-ins & rewards** — one UTC check-in per day awards 10 points, with a 50-point bonus on each 7-day streak. Points can redeem cosmetics when a catalog item has a points price. These values are starter defaults.
- **Profile analytics** — counts signed-in visits once per visitor per UTC day for the last 30 days. Owners can see recent visitors whose profiles are public; private visitor profiles are not identified. This feature does not store IP addresses or user agents.
- **Featured placement** — `profile_spotlight` and `guild_spotlight` products purchase time-limited placement. A user can feature only their own public profile; only active guild owners can feature their guild. The seed script uses sample prices; review them before enabling payments.
- **Referral rewards** — each account has a stable referral code. A new account is attributed on sign-in; both users receive 100 points after the referred user completes their first daily check-in. Attribution is one-time per account.

Whenever the schema changes, run `npm run db:generate`, review the generated migration, then run `npm run db:migrate`. After migrations, `npm run db:seed-shop` inserts the example cosmetics and spotlight products; review sample prices before production.

## DOKU integration points

- Create VA: `POST /virtual-accounts/bi-snap-va/v1.1/transfer-va/create-va`
- Check status: `POST /orders/v1.0/transfer-va/status`
- Webhook: register `https://ovyn.bio/api/webhooks/doku` in DOKU Dashboard →
  Settings → Payment Settings → Webhook

## Roadmap / not yet done

- Payment cancellation calls (DOKU delete VA) and refund flows
- `npm run check` / `npm run build` must be run locally — no CI configured yet
- Review starter cosmetic/spotlight prices and reward values before production
