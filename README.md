# ovyn

**Your identity. Your circle.** - a digital identity and community platform at `ovyn.me`.

Personal profiles, guild discovery, and membership with one strict rule: **one guild per user**.

## Stack

| Layer | Choice |
|---|---|
| Framework | SvelteKit 3 + Svelte 5 (runes) + TypeScript (strict) |
| Tooling | Vite+ (`vite-plus`) - dev, build and preview from one toolchain |
| Styling | Tailwind CSS v4 |
| Hosting | Vercel (`@sveltejs/adapter-vercel`, Node runtime) |
| Database | Neon PostgreSQL (pooled connection for app, direct for migrations) |
| ORM | Drizzle ORM |
| Auth | Standalone Better Auth - Discord and optional Google OAuth |
| Storage | Neon Object Storage (S3-compatible, presigned uploads) |
| Payments | DOKU Direct API (SNAP, server-side only) |
| Validation | Zod 4 |
| Drag and drop | dnd-kit (`@dnd-kit/svelte`) - sortable link rows and template blocks |
| Forms & client data | Superforms, TanStack Query 6, TanStack Table 9, date-fns 4 |

Note on SvelteKit 3: configuration lives in `vite.config.ts` (via the
`sveltekit()` plugin options - there is no `svelte.config.js`), imports use the
`#lib/*` subpath alias declared in `package.json`, and `$app/env/*` replaces the
old `$env/*` modules. Server-only modules read `process.env` directly, which
works unchanged on Vercel Functions.

Tooling runs on [Vite+](https://viteplus.dev) (`vite-plus`), whose core is Vite
8.3.5. SvelteKit and the Vite plugins import `vite`, so `pnpm-workspace.yaml`
overrides `vite` with `@voidzero-dev/vite-plus-core`; keep that override on the
same version as `vite-plus` in `package.json`. The scripts run through the Vite+
CLI (`vp`), which ships in the `vite-plus` package itself, so no global install
is needed: `vp dev`, `vp build`, `vp preview`, `vp lint` and `vp test`.
`svelte-check` stays in `check` because only it understands Svelte templates,
and there is no separate Vitest setup - `vp test` uses the copy Vite+ bundles.

## Getting started

```bash
pnpm install
cp .env.example .env   # fill in the values below
pnpm run db:generate    # generate SQL migrations from the schema
pnpm run db:migrate     # apply them (uses DATABASE_URL directly)
pnpm run dev
```

`pnpm run build` prerenders the landing and legal pages, so the environment
variables below must be present at build time too, not only at runtime.

## Starting from a clean database

To wipe every table and rebuild from the migration files:

```bash
pnpm run db:reset -- --yes
pnpm run db:migrate
pnpm run db:seed-shop
```

`db:reset` is destructive and only runs with the flag. It drops the `public`
and `drizzle` schemas, plus the legacy `neon_auth` schema when it still exists.
Discord and Google both sign in through the same `user` and `account` tables,
so after a reset you only need the OAuth credentials, not any provider-specific
database setup.

## Environment variables

Already provisioned for you (see `.env.example`):

- `DATABASE_URL`, `DATABASE_URL_POOLED` - Neon PostgreSQL
- `AWS_ENDPOINT_URL_S3`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET` - Neon Object Storage
- `DOKU_CLIENT_ID`, `DOKU_SECRET_KEY`, `DOKU_API_KEY` - DOKU

You must add:

- `BETTER_AUTH_SECRET` - signing secret for sessions: `openssl rand -base64 32`
- `BETTER_AUTH_URL` - the exact origin your app runs on: `http://localhost:5173`
  locally, `https://ovyn.me` in production (also set it in Vercel)
- `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` - from the Discord Developer
  Portal. In your Discord app → OAuth2 → Redirects, add:
  - `http://localhost:5173/api/auth/callback/discord` (dev)
  - `https://ovyn.me/api/auth/callback/discord` (production)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - optional Google OAuth credentials
  from Google Cloud Console. Add these authorized redirect URIs:
  - `http://localhost:5173/api/auth/callback/google` (dev)
  - `https://ovyn.me/api/auth/callback/google` (production)
- `OVYN_ADMIN_DISCORD_IDS` - comma-separated Discord user IDs authorized for
  `/admin`. Find your ID with Discord Developer Mode → right-click your profile
  → Copy User ID. Set this only in local `.env` and Vercel server environment
  variables; the server checks it against the authenticated Discord account.
- `OVYN_ADMIN_EMAILS` - optional comma-separated account emails authorized for
  `/admin`, for administrators who sign in with Google.
- `DOKU_PRIVATE_KEY` - the RSA private key DOKU gives you for SNAP B2B token
  requests (`X-SIGNATURE = SHA256withRSA(privateKey, clientID + "|" + timestamp)`)
- `DOKU_PARTNER_SERVICE_ID` - your 8-digit virtual account company code (BIN)
- `DOKU_ENV=production` (optional; sandbox is the default), `DOKU_BASE_URL` (optional override)

## PWA, typography and profile media

ovyn can be installed from supported browsers as a standalone app. Its service worker caches versioned build and static assets, shows an offline fallback for navigation, and avoids caching personalized server-rendered pages.

The interface uses Poppins for controls with a warm serif (Newsreader) for
headings, on a soft, low-contrast palette that opens dark and has a cream light
mode. The theme choice is remembered and follows you across open tabs. A pixel
snail is the mascot: one canvas creature drawn at two sizes, sitting beside the
wordmark in the header and larger in the footer. It idles, breathes, blinks,
looks around with two independently swaying eye stalks and occasionally crawls
in place on a rippling muscular foot, with a spiralled shell that carries subtle
secondary motion; the same art serves both sizes and holds a still pose for
visitors who prefer reduced motion. The landing hero has a small pixel butterfly
that drifts to random spots and stands still for visitors who prefer reduced
motion. The butterfly is
a canvas simulation: a detailed monarch sprite built from fine generated pixels,
steered by a small velocity and noise model that cruises, hovers and darts, with
wing beats that squash into perspective. The hero is also home to a living pixel
snail: a generated spiral shell with growth rings and ambient occlusion, a
translucent muscular foot, four independently swaying tentacles and a small
behaviour system that crawls, explores, rests and goes alert at its own pace,
turning away from the edges and settling in place when motion is reduced.
Every page wears
a soft aurora gradient built from the theme tokens, with a 4px pixel grain over
it, so the dark palette glows lime and the cream palette warms into gold, pink
and teal; public profiles keep their own backgrounds and opt out. Profile
wallpapers accept JPEG, PNG, WebP, GIF, MP4 and WebM uploads up to 25 MB. Custom
profile audio is user-initiated (never autoplayed); custom cursor images are
PNG/WebP uploads.

Account settings let each device manage browser notification permission and event-category preferences, with a local test notification. The service worker can receive and filter push payloads, but remote push subscriptions and server delivery are not wired yet; VAPID support remains follow-up work.

## Interface kit

Every control is a custom component in `src/lib/components/ui`: input (text, textarea, file, checkbox and radio), custom select dropdowns, checkbox, switch, card, badge, button, tooltip and the responsive overlay. The overlay is a bottom sheet below 40rem and a centered dialog above it. Dropdown panels and tooltips follow the same rule, so on a phone the option list and the hint open as a sheet at the bottom of the screen instead of a bubble near the edge. File uploads use a drag and drop dropzone that also works by click and keyboard.

The controls share one visual language: hairline dividers, soft surface gradients, an accent glow on focus, a gradient underline on active fields and Poppins type. Badges, stickers, toasts and status colors all resolve from theme tokens, so they stay legible against both the dark and the light palette.

Elevation lives in one place: the `--shadow-*` recipes and the `--layer-*` ladder in `app.css`, with `.elevated-scroll` for scroll areas that hold cards. Layout wrappers stay `overflow: visible` so a card's shadow is never sliced; clipping happens only in dedicated inner elements such as image masks, table shells, the mobile drawers and decorative glow wrappers.

Terms of Service (`/terms`) and Privacy Policy (`/privacy`) are public pages linked from the footer and from the sign-in screen.

## Key architecture notes

- **Auth** is standalone Better Auth (`src/lib/server/auth`) with Discord and
  Google OAuth sign-in (no email/password). Discord requests identity only;
  Google OAuth credentials are optional until configured. It stores
  users/sessions/OAuth accounts in our own `user`, `session`, `account`,
  `verification` tables via the Drizzle adapter, runs the catch-all
  `/api/auth/[...all]` route, and populates `locals.user` in the server hook.
  Discord accounts without an email get a stable OAuth placeholder via
  `mapProfileToUser`. Duplicate accounts for the same Discord ID are prevented
  by the unique `(provider, accountId)` pairing. Discord identity
  seeds new profiles, while profile username, display name, bio and uploaded
  avatar are ovyn-owned and remain editable. An uploaded avatar overrides the
  sign-in provider's picture until the user resets it.
- **Legacy Neon Managed Auth** - `pnpm run db:backfill` copies users and
  Discord accounts out of the old managed `neon_auth` schema into the
  standalone tables with the SAME user ids, so existing profiles, guild
  memberships, and orders keep working. It is only needed for a database that
  still holds managed-auth data; a fresh database (see above) skips it. That
  legacy schema has no Google accounts, so Google users just sign in again.
- **One guild per user** is enforced three ways: `guild_members.user_id`
  PRIMARY KEY, a `SELECT … FOR UPDATE` lock on the user row inside a
  transaction, and explicit conflict errors with user-facing explanations.
- **Payments** never touch the client: order amounts come from the products
  table, DOKU is called from server endpoints only, webhook signatures are
  verified against the raw body, and events are idempotent via unique
  `provider_event_id`. Terminal payment states never regress.
- **Rate limits** are fixed windows stored in the database, so limits hold
  across serverless instances and a new deployment does not reset them.
  Sensitive endpoints (checkout, payment status, uploads, invites, circle
  changes, template saves) answer `429` when a user exceeds their window; if the
  database is unreachable a per-instance memory window keeps the endpoint
  working.
- **Performance** - the landing, terms and privacy pages are prerendered, so
  they are served as static files with no function call; the landing's community
  counters load from a small cached endpoint after hydration, and the header
  reads the signed-in state in the browser so the shell stays identical for
  everyone. Poppins and the Geist faces are self-hosted instead of loaded from a
  font CDN, and the service worker caches chunks, styles and fonts as they are
  requested rather than precaching the whole build on install. Uploaded objects
  carry immutable cache headers while their presigned URLs are reused for days.
  The profile view counter runs after the response, the plan lookup is memoized
  for a few seconds per instance, the circle is read from the membership row
  instead of a second query, and DOKU routes get a longer function timeout.
- **Uploads** use presigned PUTs to Neon Object Storage; keys are
  server-generated and namespaced per user, and ownership is re-verified when
  a key is attached to a profile. Avatars and covers pass through a crop and
  position step first: drag the photo, zoom with the buttons or arrow keys, and
  the browser writes a square avatar or a 2.7:1 cover before the usual
  optimise and upload. Replacing an avatar, cover, background,
  audio, cursor or cosmetic artwork deletes the file it replaced, while the
  seed artwork under `static/` is shared and never deleted.
- **Shop & cosmetics** - cosmetic items (avatar frames, wallpapers, badges)
  are products: buying one through the normal DOKU checkout grants it
  automatically via the payment webhook (fulfilment is idempotent). Users
  equip/unequip owned cosmetics in profile settings; public profiles render
  frames around the avatar, wallpapers behind the header, and badges next to
  the name. Seed the starter catalog once with `pnpm run db:seed-shop`; its SVG
  artwork is bundled in `static/cosmetics/`. The shop previews each item on a
  sample profile. `/admin/catalog` lists every product in one table, with
  separate pages for creating and editing a listing, including artwork uploads
  to Neon Object Storage.

- **Limited drops** - cosmetics may have a stock cap and closing date. Stock is reserved during checkout and points redemption; expired 24-hour checkouts stop reserving units. Starter data includes one sample limited cosmetic.
- **Daily check-ins & rewards** - one UTC check-in per day awards 10 points, with a 50-point bonus on each 7-day streak. Points can redeem cosmetics when a catalog item has a points price. These values are starter defaults.
- **Profile analytics** - counts signed-in visits once per visitor per UTC day for the last 30 days. Owners can see recent visitors whose profiles are public; private visitor profiles are not identified. This feature does not store IP addresses or user agents.
- **Plans** - Free is the default. Premium is Rp 30.000 for 30 days, renewed manually with no automatic charge. Access is derived server-side from successful payment records; an admin override may also grant or force a plan; legacy time-limited plans remain supported for existing orders.
- **Workspace** - signed-in users get an account sidebar for overview, analytics, badges, settings, customization, links, plans, templates and help. Account and admin areas hide the public navbar and footer on every screen size and link back to the landing page. Platform admins get the `/admin` entry from their account overview, never from the public navigation. Admin and guild permissions remain enforced server-side. The account overview and dashboard open a share sheet for the public page: copy the link, hand it to the device share sheet where the browser supports one, or download a 1080 x 1350 card drawn in the browser with the name, handle and bio.
- **Forms, server state and tables** - forms go through Superforms with the
  shared Zod 4 schemas (`sveltekit-superforms/adapters` `zod4`): the schema is
  the single source of validation on both sides, errors land per field, and
  `$submitting`, `$message` and `use:enhance` give one consistent pattern. The
  new-link form shows it; other actions keep their small `fail` payloads until
  they are touched. TanStack Query owns client-side server state in
  `src/lib/queries`: one `QueryClient` per browser tab (and one per server
  render, so nothing is shared between users), keys built from `queryKeys`, and
  a 30 second stale window. The checkout page polls payment status through a
  query that stops once DOKU reports a terminal state, and sign-out clears the
  cache so no account's data survives the session. TanStack Table is headless
  only: `src/lib/tables/admin-catalog.ts` declares the features and typed
  columns, and `/admin/catalog` keeps its own accessible markup, sorting,
  search and pagination. Plain lists stay Svelte `{#each}` blocks, and route
  data still comes from `load` and form actions.
- **Dates** - everything formats through `src/lib/utils/date.ts` (date-fns).
  Timestamps are stored in UTC; `formatDate`, `formatDay` and
  `formatRelativeTime` render in the visitor's timezone, while `formatUtcDay`
  is used where a value is compared or submitted as a calendar day. Invalid or
  missing values return the caller's fallback instead of `Invalid Date`.
- **Profile links and templates** - public links are scheme-validated before display, and an added link can be edited (platform, address and custom label), reordered by dragging its handle (the arrow keys work too) or removed later. Templates are page layouts built from draggable content blocks (heading, text, blog post, quote, image, divider) with a markdown editor and a live preview; blocks are private by default, and a template enters the community gallery only when its owner shares it. Applying a template copies its theme and blocks onto the owner's page, where the blocks render publicly. Markdown is escaped before rendering, and image links must be HTTPS.
- **Drag and drop** - every reorderable list runs on `@dnd-kit/svelte` instead
  of hand-rolled pointer maths. Each sortable row or block is its own component
  calling `createSortable` with `id` and `index` as getters, so its identity
  survives reorders, and the `DragDropProvider` that wraps the list owns the
  state change. The grip is an `attachHandle`, which keeps a card's buttons and
  inputs out of the drag and still lets a keyboard start the drag; the link
  handle also keeps its arrow-key shortcut. `onDragOver` reorders the Svelte
  state so the move is visible while dragging, and only `onDragEnd` persists it:
  profile links post the new id order to the `reorder` action, template blocks
  flow into the hidden input and the live preview. The block palette is a
  `createDraggable` source, so a type can be dragged into the page or tapped to
  add it at the end, and a disabled sortable parked at the list's length makes
  the end drop zone a real insertion point. A cancelled drag restores the order
  it started from.
- **Living creatures** - the customize page lets an owner add up to six of the
  twelve animated creatures (butterfly, dragonfly, bat, eagle, crow, parrot,
  cockatoo, flying fish, baby dragon, pterosaur, quetzalcoatlus and ghost) to
  their public page, each with its own size, movement and animation sliders and
  an on/off switch. `src/lib/creatures` holds the shared flight simulation, one
  behaviour profile per species and the procedural pixel sprites; wings, tails,
  crests and the ghost's fade are animated per frame rather than swapped as
  still images. Only the configuration is stored, in a `creatures` JSON column
  on the profile, and the public page renders the exact saved list inside the
  profile canvas. One canvas and one animation loop run every creature, paint
  at 40fps, pause off-screen or in a hidden tab, cap themselves on small or
  low-core devices, and draw a still frame when motion is reduced. The layer is
  pointer-transparent and sits beneath the page content, so links and buttons
  stay untouched.
- **Onboarding and page help** - a new account finishes a two-step, full-screen
  onboarding (who you are, how you found ovyn) before the workspace opens; the
  answers are stored on the profile and the welcome step animates into the
  account overview. Every signed-in page also carries a question mark button that
  opens a modal explaining that page.
- **Referral rewards** - each account has a stable referral code. A new account is attributed on sign-in; both users receive 100 points after the referred user completes their first daily check-in. Attribution is one-time per account.

Whenever the schema changes, run `pnpm run db:generate`, review the generated migration, then run `pnpm run db:migrate`. After migrations, run `pnpm run db:seed-shop` once to add starter cosmetics and the Rp 30.000 monthly Premium plan. Re-running it restores starter catalog values, so make catalog changes in the admin panel after seeding.

## Monetization administration

Set `OVYN_ADMIN_DISCORD_IDS` (and optionally `OVYN_ADMIN_EMAILS` for Google
accounts) to your comma-separated IDs or addresses locally
and in Vercel, then sign in with one of those accounts and open `/admin` from
your account overview. The admin area has its own sidebar and no public navbar
or footer. It lets you browse the catalog as a table, create and edit cosmetics
and Premium plans on their own pages, set prices, points costs, drop
limits/end dates, upload cosmetic art, and review recent orders/revenue.
Cosmetics and the monthly Premium plan can be activated; new products remain
inactive until published. Premium plans are fixed at Rp 30.000 for 30 days.
Products are deactivated rather than deleted so purchase history and
ownership remain intact. `/admin/plans` switches an account between Free and
Premium by writing an override that wins over purchase-derived access; clearing
it puts the account back on whatever it actually bought. DOKU refunds are not
managed here yet.

## DOKU integration points

- Create VA: `POST /virtual-accounts/bi-snap-va/v1.1/transfer-va/create-va`
- Check status: `POST /orders/v1.0/transfer-va/status`
- Webhook: register `https://ovyn.me/api/webhooks/doku` in DOKU Dashboard →
  Settings → Payment Settings → Webhook

## Roadmap / not yet done

- Payment cancellation calls (DOKU delete VA) and refund flows
- `pnpm run check` / `pnpm run build` must be run locally - no CI configured yet
- Review starter cosmetic prices and reward values before production
