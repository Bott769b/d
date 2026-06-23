# cavoti-web

Editorial chat surface for the Cavoti relay. Next.js 15, React 19, Tailwind v4,
Motion 12, Prisma + SQLite. Works against the 15 models LO targets, and saves
every conversation to a local database.

## Models in scope

Anthropic — `claude-opus-4-8`, `claude-opus-4-7g`, `claude-opus-4-6`, `claude-sonnet-4-6`
OpenAI — `gpt-5.5-pro`, `gpt-5.5`, `gpt-5.4`, `gpt-5.4-mini`, `gpt-5.3-codex-spark`
DeepSeek — `deepseek-v4-pro`, `deepseek-v4-flash`
Zhipu — `glm-5.2`, `glm-5.1`
xAI — `grok-4.3`, `grok-build-0.1`

## Setup

```cmd
npm install
copy .env.example .env.local
```

Open `.env.local`, paste your Cavoti dashboard key, save.

```
CAVOTI_API_KEY=sk-your-key                 :: single key
CAVOTI_BASE_URL=https://cavoti.com/v1      :: optional
CAVOTI_DEFAULT_MODEL=gpt-5.4               :: optional
CAVOTI_TIMEOUT_MS=120000                   :: optional
```

To use a **pool of keys with automatic failover**, set `CAVOTI_API_KEYS`
(comma-separated) instead of `CAVOTI_API_KEY`:

```
CAVOTI_API_KEYS=sk-key-one,sk-key-two,sk-key-three,sk-key-four
```

Requests rotate through the pool (round-robin) and fail over to the next key
when one returns nothing, errors, times out, or is rate-limited — for every
model. Keys on Cavoti can expose different model sets, so each request is
routed to keys that actually advertise the requested model first (per-key
catalogs are cached for 10 minutes). See "Key failover" below.

Then create the database (one time):

```cmd
npm run db:push
```

This reads `DATABASE_URL` from `.env` (already set to `file:./dev.db`) and
creates `prisma/dev.db`. The key stays in `.env.local`; the DB path stays in
`.env` because the Prisma CLI only reads `.env`.

## Run

```cmd
npm run dev
```

Open http://localhost:3000. Pick a model from the header pill or the chip on
the composer. The picker has fuzzy search; arrow keys + Enter to pick. Past
conversations live in the left sidebar — click to reopen, hover to rename or
delete.

## Key failover

The relay client (`src/lib/cavoti.ts`) accepts a pool of keys and rotates
through them with automatic failover:

- **Round-robin start.** Each request begins on the next key in the pool so
  load spreads instead of always hammering key one.
- **Model-aware routing.** Cavoti keys can expose different model sets (one of
  yours serves all 20 models, another only four Claude models). Each request
  is routed to keys that advertise the requested model first; per-key catalogs
  are fetched from `/v1/models` and cached for 10 minutes.
- **Failover on failure.** If a key returns nothing (empty completion),
  errors (auth, rate-limit, 5xx including `model_not_found`), or times out,
  the next key is tried automatically. This is transparent — the user just
  sees the answer.
- **Commit on first token.** Once a key starts streaming text we stay on it;
  we can't rewind what you already saw, so a mid-stream failure surfaces
  rather than silently restarting.
- **No failover on intent errors.** A malformed request or a user-pressed
  Stop is final — other keys won't change the outcome.

Failover decisions are logged server-side (key index + reason), never the key
value itself.

## Accounts, privacy & encryption

cavoti-web is multi-user. People register an account, sign in, and only ever
see their own threads and files.

- **Registration** (`/register`) creates a user in the database. Passwords are
  hashed with scrypt (per-password salt) — the plaintext is never stored.
- **Login** authenticates against the database. The admin account
  (`ADMIN_USERNAME` / `ADMIN_PASSWORD`) is seeded on first login and lands on
  `/admin`; everyone else lands on `/chat`.
- **Per-user data.** Every conversation and upload is owned by a `userId`.
  The list/get/update/delete queries are all scoped, so one account can't read
  or touch another's threads — verified end to end.
- **Encrypted uploads.** Files never live in the public folder. They're
  encrypted with AES-256-GCM (key from `UPLOAD_SECRET`) and written as opaque
  `.enc` blobs under `.uploads/`. They're only decrypted in memory by the
  authenticated `/api/files/[id]` route, which also enforces ownership.
- **Chat attachments.** The composer can attach images and files. They upload
  (encrypted) before the message sends; images are passed to the model as
  vision parts (data URLs, ≤8 MB), text files are inlined (≤8000 chars), other
  files are referenced by name. Attachments render in the thread and persist
  with the message.

New env (see `.env.example`):

```
SESSION_SECRET=...     # signs session cookies
ADMIN_USERNAME=admin   # seeded admin account
ADMIN_PASSWORD=...     # change this
UPLOAD_SECRET=...      # encrypts files at rest (falls back to SESSION_SECRET)
```

After changing the schema or env, restart the dev server (env is read at
startup) — and on Windows, stop `npm run dev` before `prisma generate`/build so
the engine DLL isn't locked.

## Persistence

Conversations and messages are saved to a local SQLite file via Prisma, each
owned by the account that created them.

```
prisma/
  schema.prisma   Conversation + Message models
  dev.db          your data (gitignored)
src/lib/
  db.ts           PrismaClient singleton
  conversations.ts list / create / get / update / delete / persistExchange
  title.ts        client-safe title derivation
src/app/api/
  conversations/        GET list, POST create
  conversations/[id]/   GET (with messages), PATCH (rename/model), DELETE
  chat/                 streams the reply, then persists the exchange
```

How a turn is saved: the client lazily creates a conversation on the first
message, then streams `/api/chat` with the `conversationId`. When the stream
finishes, the route writes the user turn + assistant reply in one transaction
and bumps the conversation (setting its title from the first message). A
persistence failure never drops the reply you already saw — it's logged
server-side and the chat continues.

Useful DB commands:

```cmd
npm run db:studio    :: open Prisma Studio to browse/edit rows
npm run db:push      :: re-sync schema after editing schema.prisma
```

## Build

```cmd
npm run typecheck
npm run build
npm run start
```

`npm run build` runs `prisma generate` first. On Windows that step can fail
with `EPERM: ... rename query_engine-windows.dll.node` if the dev server (or
anything else using the Prisma client) is running and holding the DLL open.
Fix: stop `npm run dev` before building. If the client is already generated,
you can also build directly with `npx next build`.

## What's where

```
src/
  app/
    layout.tsx       fonts, theme bootstrap, metadata
    page.tsx         server component renders <Workspace>
    globals.css      design tokens, theme overrides, animations
    api/
      chat/route.ts          POST: streams NDJSON, persists the exchange
      models/route.ts        GET: returns the model catalog
      conversations/route.ts GET list / POST create
      conversations/[id]/route.ts  GET / PATCH / DELETE
  components/
    chat/
      Workspace.tsx  state + streaming + conversation orchestration
      Sidebar.tsx    history rail/drawer: list, new, rename, delete
      Header.tsx     brand, active title, model trigger, theme toggle
      Composer.tsx   auto-grow textarea, send/stop button, model trigger
      Thread.tsx     message list, scroll anchor
      Message.tsx    one entry — handles streaming/thinking/error states
      ModelPicker.tsx fuzzy-search popover with provider grouping
      EmptyState.tsx rotating editorial prompt + 4 seeds
      ThinkingMark.tsx heartbeat dots used while we wait for first token
    ui/
      BrandMark.tsx  hand-drawn butterfly mark
      ThemeToggle.tsx sun/moon morph, persists to localStorage
      Button.tsx     tactile motion button
      Tooltip.tsx    minimal hover tooltip
    motion/
      easings.ts     shared timing curves and springs
  lib/
    cavoti.ts        server-only relay client (SSE → parsed chunks)
    db.ts            PrismaClient singleton
    conversations.ts persistence helpers (server-only)
    title.ts         client-safe title derivation
    models.ts        the curated 15-model registry
    types.ts         shared chat + stream-frame types
prisma/
  schema.prisma      Conversation + Message
  dev.db             local SQLite data (gitignored)
```

## Streaming protocol (client ↔ /api/chat)

NDJSON. One JSON object per line, terminated by `\n`. Frames:

```
{"type":"delta","text":"…token piece…"}
{"type":"done","finish_reason":"stop","model":"gpt-5.4","usage":{...}}
{"type":"error","code":"auth","message":"…","requestId":"…"}
```

The client (`Workspace`) accumulates `delta.text` into a `chunks: string[]`
on the streaming assistant message. Each chunk renders as `<span data-chunk>`
which triggers the `ink-settle` keyframe in globals.css — small fade + slide
+ blur that reads as ink hitting paper, not as a robot typing.

## Design notes

- Two themes share the same components. `theme-ink` swaps a handful of CSS
  custom properties and that's it. No duplicated trees.
- Accent (`--color-ember`) shows up sparingly: focus rings, send button,
  active rail in the picker, the dot next to the active model. Negative
  space carries the rest.
- Type pairing: Inter Tight for body, Instrument Serif (italic) for the
  empty-state pull-quote and the wordmark, Geist Mono for ids and kbd.
- Motion: outQuint for entrances, custom spring for tactile press, blur+
  slide reveals for streaming text, a slow `cursor-pulse` keyframe for the
  end-of-stream caret. All respects `prefers-reduced-motion`.
- Grain: a static SVG noise data URL layered into the body background at
  ~5% opacity. Adds tactility without animating.

## Notes

- The api key never reaches the browser. The Cavoti relay client lives in
  `src/lib/cavoti.ts` with `import "server-only"`; the page only talks to
  `/api/chat` and `/api/models`.
- `Workspace` keeps the conversation in memory. Refresh wipes it. If you
  want persistence later, add a Prisma model + a `/api/conversations` route
  the same shape as `ai-chat/`.
- `Composer` blocks new sends while a stream is in flight. The Stop button
  aborts the underlying fetch, and the partial reply gets preserved.
- Reduced motion: every keyframe collapses to ~0ms. Layout still works.

## Bumping Next (security)

The pinned `next@15.1.3` has CVE-2025-66478 flagged at install time (a React
Server Components RCE in older 15.x and 16.0.x lines). Local dev is fine —
the issue only surfaces in a public deployment. When you're ready to bump:

```cmd
npm i next@15.3.9 --save-exact
```

(or whichever current 15.x patched release is out). Re-run `npm run build`
after, no source changes needed.

## Pages, auth & uploads

Routes:

```
/          landing page (public, static, animated)
/login     username + password sign-in (public)
/chat      the chat workspace (requires any session)
/admin     dashboard + file/image uploads (requires admin session)
```

Auth is a signed-cookie session (HMAC-SHA256 via Web Crypto, so the same
verifier runs in route handlers and the Edge middleware). On login:

- username `admin` + `ADMIN_PASSWORD` → role **admin** → redirected to `/admin`
- any other non-empty username + password → role **user** → redirected to `/chat`

`src/middleware.ts` gates `/chat`, `/admin`, and `/api/upload`; unauthenticated
visitors are bounced to `/login?next=…`, and non-admins can't reach the admin
area. Sign out from the icon in the chat header or the admin top bar.

Uploads (admin only) are stored on disk under `public/uploads/` and recorded in
the `Upload` table. The dashboard supports drag-drop or click, shows progress,
previews images, lists everything with size/date, and can delete (removes the
file and the row). Limit is 25 MB per file.

```
src/lib/session.ts        sign/verify token, credential resolution
src/lib/auth-server.ts    getSession / requireAdmin (route handlers)
src/app/api/auth/*         login / logout / me
src/app/api/upload/*       POST (multipart) + GET list, [id] DELETE
src/components/landing/    Landing.tsx
src/components/auth/       LoginForm.tsx
src/components/admin/      AdminDashboard.tsx, Uploader.tsx
```

> SECURITY NOTE — accounts now use real registration with scrypt-hashed
> passwords, per-user data isolation, and AES-256-GCM encrypted uploads served
> only through the authenticated `/api/files/[id]` route. It's solid for a
> local/private deployment. Before exposing it publicly, still: set strong
> `SESSION_SECRET` / `UPLOAD_SECRET` / `ADMIN_PASSWORD`, serve over HTTPS, and
> consider rate-limiting registration and login.

## Deploy to Railway

Railway runs the app as a long-lived container with a persistent volume, so the
SQLite database and encrypted uploads work as-is — they just need to live on
the volume. A `Dockerfile` and `railway.json` are included.

1. Push this folder to a Git repo and create a Railway project from it. Railway
   picks up the Dockerfile + railway.json automatically.
2. Add a **Volume** to the service, mounted at `/data`.
3. Set these service **Variables** (Railway dashboard):

   ```
   DATABASE_URL=file:/data/dev.db
   UPLOAD_DIR=/data/uploads
   SESSION_SECRET=<long random string>
   UPLOAD_SECRET=<another long random string>
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=<a strong password>
   CAVOTI_API_KEYS=sk-...,sk-...,sk-...,sk-...
   CAVOTI_DEFAULT_MODEL=gpt-5.4
   # optional: CAVOTI_BASE_URL, CAVOTI_TIMEOUT_MS
   ```

   Don't set `PORT` — Railway injects it and `next start` honours it.
4. Deploy. On boot the container runs `prisma db push` against the volume DB
   (creating the schema on first run), then starts the server. Railway's
   healthcheck hits `/api/health`.
5. Open the generated URL, sign in as `admin`, or register a writer account.

Notes:
- `.env` / `.env.local` are never shipped (see `.dockerignore`) — set everything
  through Railway Variables instead.
- Generate a secret with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
- The volume keeps your DB + encrypted files across deploys — don't delete it.
- The same Dockerfile works on Render or Fly.io: attach a disk and point
  `DATABASE_URL` / `UPLOAD_DIR` at it.
