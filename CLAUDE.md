# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout (current, not aspirational)

This is a pnpm + Turborepo monorepo. **The root `README.md` describes a target architecture (`apps/client`, `apps/admin`, `apps/auth-service`) that does not exist yet** — treat it as a design doc, not ground truth. The actual current layout is:

- `apps/client` — the only frontend app. It contains **both** the customer storefront (`src/pages/user`, `src/components/user`) and the admin dashboard (`src/pages/admin`, `src/components/admin`) in one React Router tree (see `src/router.tsx`). There is no separate `apps/admin`.
- `apps/backends/mongo` — the Express + MongoDB backend (this is the app the README calls `auth-service`, but it now covers auth, catalog, cart, checkout, orders, promos, wishlist, dashboard, and settings — not just auth).
- `apps/backends/nestjs`, `apps/backends/postgres` — empty placeholder directories, unused.
- `packages/types` (`@repo/types`) — shared Zod schemas and TS types (user, product, promo, cart, checkout, wishlist, cookie) used by both the client and the mongo backend for request validation.
- `packages/ui`, `packages/typescript-config`, `packages/eslint-config` — shared UI components and shared tsconfig/eslint bases.

There is a root `migrate.sh` script that would rename `apps/backends/mongo` → `apps/auth-service` and delete the nestjs/postgres placeholders to match the README's target layout. **It has not been run** — do not assume the migration has happened, and do not run it yourself unless the user explicitly asks.

## Commands

Run from the repo root (Turborepo fans these out per-package):

```bash
pnpm install          # install all workspace deps
pnpm dev              # run dev servers for all apps (turbo run dev)
pnpm build            # build all apps/packages
pnpm lint             # eslint across the workspace
pnpm typecheck        # tsc -b / --noEmit across the workspace
pnpm format           # prettier --write on ts/tsx/md
```

Scope to a single workspace with `--filter`, e.g. `pnpm --filter client dev`. There is no root-level `pnpm test` task with actual tests configured in the workspaces today.

### Backend (`apps/backends/mongo`)

```bash
pnpm --filter auth-service dev      # tsx watch src/index.ts (API server; also starts the BullMQ worker via `import "./worker"`)
pnpm --filter auth-service worker   # tsx watch src/worker.ts (standalone worker process)
pnpm --filter auth-service build    # tsc
pnpm --filter auth-service typecheck
```

Requires MongoDB and Redis. `docker-compose.yml` at the repo root provides two Redis instances and nothing else: `redis` (`localhost:6379`, `noeviction`) for BullMQ and the rate limiter, and `redis-cache` (`localhost:6380`, `volatile-lru`, no persistence) for the response cache. Keep them separate — the cache must evict, and the queue instance must never. MongoDB is expected to be external (e.g. Atlas — see `MONGO_URI` in `.env.example`). Copy `apps/backends/mongo/.env.example` to `.env` and fill in real secrets before running; `src/constants/env.ts` throws at startup on any missing env var (no defaults except where explicitly given).

In development, BullMQ's Bull Board is mounted at `http://localhost:<PORT>/admin/queues` (disabled when `NODE_ENV=production`).

### Client (`apps/client`)

```bash
pnpm --filter client dev       # vite
pnpm --filter client build     # tsc -b && vite build
pnpm --filter client lint      # eslint .
```

Copy `apps/client/.env.example` to `.env` and set `VITE_API_URL` to point at the backend.

## Backend architecture (`apps/backends/mongo`)

Layering is strict: **route → controller → service → model**. Controllers never touch the response envelope shape directly except via helpers; services never touch `req`/`res`.

- **Routes** (`src/routes/*.route.ts`) wire URL + HTTP verb + middleware to a controller. All routers are mounted at `/` (or `/auth`, `/session`) in `src/index.ts`; each route file owns its own path prefixes.
- **Controllers** (`src/controllers/*.controller.ts`) are always wrapped in `catchError(...)` (`src/utils/errors/catchError.ts`), which forwards thrown errors to `next(error)` instead of needing try/catch in every handler. A controller: validates `req.body`/`req.params` with a Zod schema from `@repo/types` (or a local schema), calls one service function, and returns via the `ok(...)` / response envelope helpers in `src/utils/api`.
- **Services** (`src/services/*.service.ts`) hold business logic and Mongoose queries, and use `appAssert(condition, httpStatusCode, message, appErrorCode?)` (`src/utils/errors/appAssert.ts`) to fail fast with a typed `AppError` instead of manual `if (!x) throw`.
- **Models** (`src/models/*.model.ts`) are Mongoose schemas/documents.
- **Response envelope**: every JSON response follows `ApiEnvelope<T>` from `src/utils/api/apiEnvelope.ts` — `{ status: 'success'|'error', data, meta?, errors? }`. Use `ok(data)` / `fail(message, code)` rather than hand-rolling response bodies.
- **Errors**: `errorHandler` middleware (`src/middleware/errorHandler.ts`, mounted last in `index.ts`) centrally handles `ZodError` (→ 400 with field errors), `AppError` (→ its own status code), and everything else (→ 500). It also clears auth cookies when an error occurs on the refresh-token path.
- **Auth**: JWT access + refresh tokens are set as httpOnly cookies (`src/utils/auth/cookies.ts`, `jwt.ts`). Sessions are persisted in Mongo (`SessionModel`) and looked up by `sessionId` embedded in the token payload — logout/refresh operate on the session document, not just the token. `req.userId`, `req.sessionId`, and `req.role` are populated by the `authenticate` middleware and typed via the global `Express.Request` augmentation in `src/types/express.d.ts`.
- **Background jobs**: BullMQ queues/producers/processors/workers live under `src/jobs/`, one subfolder per concern (`email`, `image`) plus `redis/connection.ts` for the shared ioredis connection and `dashboard/bull-board.ts` for the queue UI. Producers are called from services (e.g. `auth.service.ts` enqueues verification emails instead of sending them inline); processors/workers actually perform the work and run in the same process as the API by default (`index.ts` does `import "./worker"`), or standalone via `pnpm worker`.
- **Caching**: `src/utils/cache` (`cache.getOrSet`, `cache.versionedKey`, `cache.bump`) is a cache-aside layer that never throws — Redis failures read as misses, behind the same circuit breaker the rate limiter uses. Two invalidation styles, and using the wrong one is the easy mistake:
  - **Versioned namespace** for entries that can't be enumerated: keys embed the version of each domain they read (`catalog`, `products`, `facets`, `promos`, `banners`), and **any write must `cache.bump(domain)` after it succeeds**. A bump retires every entry of that domain, which is why product *listings* and the home feed live here (a product edit can move it into or out of any filter) and why their TTL is only 60s.
  - **Per-entity keys** for entries that can: a product's detail page is `cache:product:detail:<id>` with no version stamp, so editing one product does not flush every other product's page. Every write that changes a product must call `invalidateProductDetails([id])` (`product.service.ts`) — admin edits, the image worker, and order stock changes all do. Renaming a brand, category or type changes the names embedded in those pages, so those three paths call `invalidateProductDetailsWhere({ brand: id })` and friends.
  - `facets` is bumped only where the colour list can change (product create/delete, or an update touching `colors`/`status`), never by an image or title edit.
  - Session revocation must go through `revokeSessions` in `auth.service.ts`, never a direct `SessionModel.delete*`, because `authenticate` caches active sessions for 60s.
- **Payments**: Razorpay. `/checkout/confirm` verifies the signature, re-fetches the payment and checks amount + capture, then calls `fulfillPaidOrder` (`checkout.service.ts`) — the one transaction that decrements stock and the promo, clears the bought cart lines and marks the order paid. It re-reads the order inside the transaction, so it is idempotent. `POST /webhooks/razorpay` calls the same function for a payment whose customer never returned to confirm; it is mounted in `index.ts` **before** `express.json()` (the signature covers the raw bytes) and needs `RAZORPAY_WEBHOOK_SECRET`, without which the app refuses to start in production.
- **Pagination**: list endpoints return the rows in `data` and `{ page, limit, total, hasMore }` in the envelope's `meta` (`paginationQuerySchema` in `@repo/types`, max 100 per page). `/products` and `/admin/orders` use it; the client reads `meta.hasMore` (`useInfiniteQuery` on the storefront, `AdminPager` in the admin tables).
- **Rate limiting**: custom Redis-backed limiter with an in-memory fallback and circuit breaker under `src/utils/rateLimiter/` (`redisStore.ts`, `memoryStore.ts`, `circuitBreaker.ts`, `luaScript.ts`), wired in as `src/middleware/rateLimiter.ts`.
- Utility folders (`src/utils/auth`, `src/utils/email`, `src/utils/errors`, `src/utils/api`, `src/utils/date`, `src/utils/rateLimiter`) each re-export through an `index.ts` — import from the folder, not the individual file, when both exist.

## Client architecture (`apps/client`)

- **Routing** (`src/router.tsx`): a single `createBrowserRouter` tree under `UserLayout`. Auth gating is composed via layout/wrapper routes, not per-page checks: `PublicRoute` (redirect away if already logged in), `ProtectedRoute` (redirect to `/login` if not logged in), `RoleGuardLayout allow={[...]}` (redirect if role doesn't match — used to gate the whole `/admin` subtree). `AuthLoader` resolves the current session before routes render.
- **State**: Zustand stores in `src/store/` (`auth.store.ts`, `product.store.ts`, `promo.store.ts`) hold client-side UI/session state (e.g. the logged-in user). Server data is not duplicated into Zustand — that's TanStack Query's job.
- **Server data**: TanStack Query. Convention is one hook per operation under `src/hooks/<domain>/useXxx.ts` (e.g. `useLogin`, `useCreateProduct`), each wrapping a `useQuery`/`useMutation` around a function from `src/api/<domain>.ts`. Mutation hooks handle their own side effects (updating the Zustand store, seeding/invalidating query cache via the shared `src/lib/queryClient.ts`, navigating).
- **HTTP client** (`src/lib/api.ts`): a single Axios instance (`API`) with `withCredentials: true` for cookie-based auth. Its response interceptor implements silent access-token refresh on a 401: it queues concurrent failing requests while one `/auth/refresh` call is in flight, replays them on success, and clears the auth store on refresh failure. Requests to `AUTH_ROUTES` are exempted from the retry-on-401 logic to avoid refresh loops. Errors are normalized to a `{ status, message, code, errors }` shape before rejecting — read `error.message`/`error.code` in callers rather than the raw Axios error.
- **Path alias**: `@/*` maps to `src/*` (see `tsconfig.app.json`), used throughout instead of relative imports.
- **Shared types/validation**: import Zod schemas and inferred types from `@repo/types` (`packages/types`) for anything that must match the backend's validation (e.g. `LoginInSchema`, `registerSchema`) rather than redefining shapes locally.
- **UI primitives**: `src/components/ui/*` are shadcn-style primitives (Radix UI + `class-variance-authority` + `tailwind-merge`); compose these rather than styling raw HTML elements for form controls, dialogs, dropdowns, etc.
