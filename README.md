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
| Auth | Better Auth — Discord OAuth (`identify` scope only) |
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

- `BETTER_AUTH_SECRET` — `openssl rand -base64 32`
- `BETTER_AUTH_URL` — e.g. `http://localhost:5173` (or your deployment URL)
- `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` — from the Discord Developer Portal,
  with redirect `${BETTER_AUTH_URL}/api/auth/callback/discord`
- `DOKU_PRIVATE_KEY` — the RSA private key DOKU gives you for SNAP B2B token
  requests (`X-SIGNATURE = SHA256withRSA(privateKey, clientID + "|" + timestamp)`)
- `DOKU_PARTNER_SERVICE_ID` — your 8-digit virtual account company code (BIN)
- `DOKU_ENV=production` (optional; sandbox is the default), `DOKU_BASE_URL` (optional override)

## Key architecture notes

- **Auth** lives in `src/lib/server/auth`. Better Auth owns the `user`,
  `session`, `account`, `verification` tables (see `src/lib/server/db/schema/auth.ts`).
  On every session creation, `provisionUser` pulls the Discord identity
  server-to-server and ensures a profile with a unique slug.
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

## DOKU integration points

- Create VA: `POST /virtual-accounts/bi-snap-va/v1.1/transfer-va/create-va`
- Check status: `POST /orders/v1.0/transfer-va/status`
- Webhook: register `https://ovyn.bio/api/webhooks/doku` in DOKU Dashboard →
  Settings → Payment Settings → Webhook

## Roadmap / not yet done

- Payment cancellation calls (DOKU delete VA) and refund flows
- `npm run check` / `npm run build` must be run locally — no CI configured yet
- Product seeding: insert `products` rows (inactive by default) once pricing is decided
