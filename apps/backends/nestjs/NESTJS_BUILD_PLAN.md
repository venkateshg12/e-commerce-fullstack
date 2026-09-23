# Building the backend again on NestJS + PostgreSQL + Prisma

A step-by-step plan for rebuilding this e-commerce backend in `apps/backends/nestjs`, using
**NestJS** on **PostgreSQL (Neon)** with **Prisma 8**. The goal is the same as the Postgres plan's —
learn the stack properly — plus one more: learn how a production NestJS codebase is organised
(modules, dependency injection, guards, pipes, interceptors, filters, tests).

Read `../postgres/POSTGRES_BUILD_PLAN.md` first if you haven't. This plan reuses its database
decisions instead of repeating them, and focuses on what NestJS changes.

---

## The one rule

**The API stays identical to the Mongo backend.** Same routes, same `{ status, data, meta, errors }`
envelope, same httpOnly cookie auth.

That gives you:

1. The React client in `apps/client` as your test harness. No frontend work.
2. A way to check every phase in a real browser.
3. A one-line switch between backends: point `VITE_API_URL` at a different port.

| Backend | Port |
|---|---|
| Mongo (`apps/backends/mongo`) | 5000 |
| Postgres + Express (`apps/backends/postgres`) | 5001 |
| **Postgres + NestJS (`apps/backends/nestjs`)** | **5002** |

> ⚠️ **Don't run the root `migrate.sh`.** It deletes `apps/backends/nestjs` (it was written when
> this folder was an empty placeholder).

---

## Stack

```
NestJS 12            framework (modules, DI, guards, pipes, interceptors, filters)
Express 5            the HTTP adapter under Nest (@nestjs/platform-express)
PostgreSQL on Neon   the database — its own Neon branch, not the Postgres app's
Prisma 8             @prisma/orm-postgres: contract file, migrations, typed client
Zod via @repo/types  the same validation schemas the client uses
BullMQ + Redis       @nestjs/bullmq for email/image/cleanup jobs
Redis (cache)        the separate redis-cache instance on 6380
nestjs-pino          structured JSON logs with a request id
@nestjs/terminus     health checks
Jest + supertest     unit and e2e tests (whatever `nest new` scaffolds)
```

### Versions: checked on npm on 2026-09-23

| Package | Version | Note |
|---|---|---|
| `@nestjs/core`, `common`, `platform-express`, `testing` | 12.1.0 | Nest 12.0.0 shipped 2026-08-27. |
| `@nestjs/cli` | 12.0.5 | |
| `@nestjs/config` | 12.0.1 | |
| `@nestjs/bullmq` | 12.0.0 | peer: Nest 10–12, bullmq 3–6 |
| `@nestjs/terminus` | 12.1.0 | |
| `nestjs-pino` | 5.2.0 | |
| `@prisma/orm-postgres` | 8.0.0-rc.11 | same as `apps/backends/postgres` |
| `prisma` (CLI) | 8.0.0-rc.15 | |
| `@prisma/cli-engine` | **0.4.0 exactly** | `@prisma/orm-toolchain` asks for 0.4.0; `latest` is 0.3.0 |
| ~~`nestjs-zod`~~ | 5.5.0 | **Don't use:** its peer range stops at Nest 11. Write a 15-line pipe instead (phase 1). |

**Two things are newer than the guidance in this plan. Verify them before you build on them.**

- **Nest 12** is recent. Everything here uses APIs that have been stable since Nest 10/11:
  modules, guards, pipes, interceptors, filters, `rawBody`, `enableShutdownHooks`. Read the Nest 12
  release notes in phase 0. If something here doesn't match, pin Nest 11.
- **Prisma 8** is a new ORM, not a new CLI for the old one. There's no `PrismaClient`, no
  `$transaction`, no `$queryRaw`. Phase 2 starts with an **API spike**: a short list of calls you
  confirm work before you design any service around them.

---

## Express → NestJS translation table

Keep this open while you work. The left column is what the Mongo backend does today.

| Express (Mongo backend) | NestJS |
|---|---|
| `routes/*.route.ts` + `controllers/*.controller.ts` | One `@Controller()` class per feature module. The route decorators (`@Get`, `@Post`…) replace the router. |
| `services/*.service.ts` | `@Injectable()` services, injected through the constructor. |
| `catchError(handler)` wrapper | **Not needed.** Nest catches thrown errors and sends them to the exception filter. |
| `errorHandler` middleware (mounted last) | A global `@Catch()` **exception filter**. |
| `ok(data)` in every controller | A global **interceptor** wraps whatever the handler returns. Controllers return plain data. |
| `Schema.parse(req.body)` in controllers | A `ZodValidationPipe`: `@Body(new ZodValidationPipe(schema))`. |
| `authenticate` middleware | A global `AuthGuard` + a `@Public()` decorator. **Secure by default**: a new route is protected unless you opt it out. |
| `requireAdmin` middleware | `RolesGuard` + `@Roles('admin')`. |
| `req.userId`, `req.sessionId`, `req.role` | A `@CurrentUser()` parameter decorator. |
| `res.cookie(...)` | `@Res({ passthrough: true }) res` (keeps the interceptor and filter working). |
| `appAssert(...)` / `AppError` | Keep both. The filter maps `AppError` to its status code. |
| Rate limiter middleware per route | A `RateLimitGuard` + `@RateLimit(...)` decorator wrapping the existing store, Lua scripts and breaker (phase 4 explains why not `@nestjs/throttler`). |
| `visitorId` middleware | Stays a middleware, applied in `AppModule.configure()`. |
| `multer` + `upload.array("images")` | `@UseInterceptors(FilesInterceptor('images', 10, options))` + `@UploadedFiles()`. |
| Webhook router mounted before `express.json()` | `NestFactory.create(AppModule, { rawBody: true })` and read `req.rawBody`. |
| `jobs/queues`, `producers`, `workers`, `processors` | `BullModule.registerQueue()`, `@InjectQueue()` in services, `@Processor()` classes. |
| `utils/cache` singleton | A `CacheService` provider in a global `CacheModule` (your own, not `@nestjs/cache-manager`). |
| `constants/env.ts` (throws on missing vars) | `ConfigModule.forRoot({ validate })` with a Zod schema. Same fail-fast, typed. |
| `process.on('SIGTERM', shutdown)` | `app.enableShutdownHooks()` + `onApplicationShutdown()` in each module that owns a connection. |
| `console.log` / `morgan` | `nestjs-pino` (JSON logs, a request id on every line). |
| `/health` handler | `@nestjs/terminus` with a Postgres check and a Redis check. |

### Where does each existing file go?

Some folders need no changes at all. **Copy these verbatim:**

```
mongo/src/constants/{https,appErrorCode,verificationLinkType,queue}.ts
mongo/src/utils/api/*                 (ok/fail still used by the interceptor and filter)
mongo/src/utils/errors/{appError,appAssert}.ts
mongo/src/utils/auth/{jwt,bcrypt,cookies,verificationToken}.ts
mongo/src/utils/date/*, utils/currency.ts, utils/variants.ts
mongo/src/utils/email/*               (templates + send function)
mongo/src/utils/rateLimiter/*         (store, breaker, lua: wrapped by phase 4, not rewritten)
mongo/src/utils/cache/*               (wrapped by phase 10)
mongo/src/utils/{cloudinary,imageProcessor,razorpay}.ts
```

Everything under `routes/`, `controllers/`, `middleware/`, `services/`, `models/` and `jobs/` is
**rewritten** as Nest modules. The business logic in the services carries over. The wiring and
the database queries change.

---

## Target folder structure

Feature modules, plus `common/` for cross-cutting code and `infra/` for connections to outside
systems. This is the layout most production Nest codebases use.

```
apps/backends/nestjs/
├── package.json              name: "nestjs-service"
├── nest-cli.json
├── tsconfig.json / tsconfig.build.json
├── prisma.config.ts
├── migrations/               Prisma 8 migration packages (+ migration.sql, see phase 2)
├── test/                     e2e tests (supertest)
└── src/
    ├── main.ts               bootstrap: IPv4 pin, rawBody, helmet, cors, cookies, shutdown hooks
    ├── app.module.ts
    ├── config/               env.schema.ts (Zod) + typed config
    ├── common/
    │   ├── api/              ok/fail, Paginated
    │   ├── errors/           AppError, appAssert
    │   ├── filters/          all-exceptions.filter.ts
    │   ├── interceptors/     envelope.interceptor.ts
    │   ├── pipes/            zod-validation.pipe.ts
    │   ├── guards/           auth.guard.ts, roles.guard.ts
    │   ├── rate-limit/       RateLimitGuard, @RateLimit, RateLimitService
    │   ├── decorators/       @Public, @Roles, @CurrentUser
    │   └── middleware/       visitor-id.middleware.ts
    ├── infra/
    │   ├── db/               DbModule: the Prisma 8 client as an injectable provider
    │   ├── redis/            RedisModule: the queue and cache connections
    │   ├── cache/            CacheModule: CacheService
    │   ├── mail/             MailService (enqueues, never sends inline)
    │   └── storage/          Cloudinary wrapper
    ├── prisma/               contract.prisma, contract.json, contract.d.ts
    └── modules/
        ├── health/  auth/  sessions/  users/  addresses/
        ├── catalog/  products/  home/
        ├── cart/  wishlist/  promos/
        ├── checkout/  orders/  webhooks/
        ├── settings/  dashboard/
        └── jobs/             email + image + cleanup processors
```

**Rule:** a feature module never imports another feature module's service directly unless that
module exports it. Circular imports between feature modules (`forwardRef`) mean the boundary is
wrong. Move the shared logic down into a service that both modules import.

---

# The phases

Build in this order. Each phase depends on the ones before it and ends with a checkpoint you can
actually run. The detail for each phase is in `architect/`.

| # | Phase | What you end up with |
|---|---|---|
| 00 | [Skeleton](architect/phase-00-skeleton.md) | `nest new` in the monorepo, typed config, logs, `/health`, port 5002 |
| 01 | [Core plumbing](architect/phase-01-core-plumbing.md) | Envelope interceptor, exception filter, Zod pipe, 404 parity |
| 02 | [Database](architect/phase-02-database.md) ⭐ | Prisma 8 API spike, `DbModule`, the full contract, migrations with `.sql` |
| 03 | [Auth](architect/phase-03-auth.md) ⭐ | Register → verify → login → refresh → logout, guards and decorators |
| 04 | [Rate limiting](architect/phase-04-rate-limiting.md) | The existing Redis limiter as a Nest guard, same limits as today |
| 05 | [Catalog](architect/phase-05-catalog.md) ⭐ | Categories, brands, products, facets, pagination, admin CRUD |
| 06 | [Jobs and uploads](architect/phase-06-jobs-uploads.md) | `@nestjs/bullmq` email + image jobs, file uploads, Bull Board |
| 07 | [Cart, wishlist, address](architect/phase-07-cart-wishlist-address.md) | Upserts on composite keys, sync endpoints |
| 08 | [Checkout and orders](architect/phase-08-checkout-orders.md) ⭐ | Razorpay, idempotent fulfilment, raw-body webhook |
| 09 | [Promos, settings, home](architect/phase-09-promos-settings-home.md) | The remaining modules |
| 10 | [Cache](architect/phase-10-cache.md) | `CacheService`, both invalidation styles, session cache |
| 11 | [Dashboard](architect/phase-11-dashboard.md) | Analytics as raw SQL |
| 12 | [Operations](architect/phase-12-operations.md) | Cleanup job, terminus health, shutdown, Docker, CI |

---

## Testing strategy

The Postgres plan doesn't cover tests. This plan does, because every production Nest codebase has
them and Nest's DI makes them cheap.

| Kind | What | Where | Runs against |
|---|---|---|---|
| **Unit** | One service or guard, dependencies replaced with fakes via `Test.createTestingModule().overrideProvider()` | `*.spec.ts` beside the file | Nothing external |
| **e2e** | The real app over HTTP with supertest: status codes, envelope shape, cookies | `test/*.e2e-spec.ts` | The **docker** `postgres` service (root `docker-compose.yml`) + local Redis |
| **Parity** | The same request to the Mongo backend (5000) and this one (5002), JSON diffed | a script, phase 12 | Both running locally |

Two rules:
- **e2e never touches Neon.** Point `DATABASE_URL` at the local container in `.env.test`. Reset it
  between test files: truncate every table or recreate the schema.
- **Write the test the phase's checkpoint describes.** If the checkpoint is "two concurrent confirms,
  exactly one succeeds", that becomes an e2e test and stays in the suite for good.

---

## Gotchas that will bite

| | |
|---|---|
| **Prisma 8 is not Prisma 7** | Every Prisma snippet from a tutorial or older AI answer uses `PrismaClient`. None of it applies. Trust the phase-2 spike, `prisma-8.md`, and the types in `node_modules`. |
| **ESM-only Prisma package** | `@prisma/orm-postgres` ships only `.mjs`. Nest builds CommonJS. This works on Node ≥ 22.12 (`require(esm)`; checked on Node 22.23). Pin `"engines": { "node": ">=22.12" }`. |
| **`@Res()` without `passthrough`** | Takes the response away from Nest: the interceptor, filter and return value all stop working for that route. Always `@Res({ passthrough: true })`. |
| **Global guard order** | Guards run in registration order. Rate limit first, then auth, then roles. Otherwise a flood of bad tokens never reaches the limiter. |
| **Request-scoped providers** | `@Injectable({ scope: Scope.REQUEST })` re-creates the whole dependency chain on every request. Don't. Pass the user as an argument instead. |
| **`@nestjs/schedule` on several instances** | A cron fires on every instance. Recurring jobs go through BullMQ with a fixed job id (phase 12). |
| **Transactions and HTTP calls** | Never call Razorpay, Cloudinary or email inside a DB transaction. The transaction holds a connection for as long as the call takes. |
| **WSL2 IPv6** | The IPv4 pin from `apps/backends/postgres/src/config/db.ts` goes at the top of `main.ts`, before anything connects. |
| **`BigInt` in JSON** | `count(*)` from raw SQL comes back as `bigint`, and `JSON.stringify` throws on it. Convert in the service. |
| **Migrations** | `db:plan` only compares the contract with the last migration. Edit `contract.prisma` first, or it says "No changes detected". |

---

## Finish checklist: every route, from `mongo/src/routes`

Tick each one off against the Mongo backend: same path, same status code, same response shape.

- **auth** (`/auth`): `POST /register`, `POST /login`, `GET /refresh`, `GET /logout`,
  `GET /verify/:token`, `POST /verify/resend`, `POST /password/forgot`,
  `POST /password/reset/:token`, `POST /google`, `GET /me`, `PATCH /me`, `POST /me/avatar`,
  `POST /me/password`
- **session** (`/session`): `GET /`, `DELETE /:id`
- **home**: `GET /home`
- **products**: `GET /products`, `GET /products/facets`, `GET /products/:id`,
  `POST /admin/products`, `PATCH /admin/products/:id`, `DELETE /admin/products/:id`,
  `POST /admin/products/:id/images`, `DELETE /admin/products/:id/images`,
  `PATCH /admin/products/:id/images/cover`, `PATCH /admin/products/:id/images/color`
- **catalog**: `GET /categories`, `GET /brands`, `GET /admin/categories`,
  `POST|PUT|DELETE /admin/categories[/:id]`, `POST|PUT|DELETE /admin/sub-categories[/:id]`,
  `POST|PUT|DELETE /admin/brands[/:id]`
- **address**: `GET /address`, `POST /address`, `PATCH /address/:id`, `DELETE /address/:id`
- **cart**: `GET /cart`, `POST /cart`, `POST /cart/sync`, `PATCH /cart`, `DELETE /cart`,
  `DELETE /cart/clear`
- **wishlist**: `GET /wishlist`, `POST /wishlist`, `POST /wishlist/toggle`, `POST /wishlist/sync`,
  `DELETE /wishlist`
- **promos**: `GET /promos`, `GET /promos/active`, `POST /promos`, `POST /promos/apply`,
  `PATCH /promos/:id`, `DELETE /promos/:id`
- **checkout**: `POST /checkout/create-session`, `POST /checkout/resume-session`,
  `POST /checkout/confirm`, `GET /checkout/points`, `POST /checkout/pay-with-points`
- **orders**: `GET /orders`, `PATCH /orders/:orderId/cancel`, `PATCH /orders/:orderId/return`,
  `GET /admin/orders`, `PATCH /orders/:orderId/status`
- **settings**: `GET|POST /settings/banners`, `GET|POST /admin/settings/banners`,
  `DELETE /settings/banners/:id`
- **dashboard**: `GET /dashboard/lite`, `GET /admin/dashboard`
- **webhooks**: `POST /webhooks/razorpay`
- **health**: `GET /health`
- **dev only**: Bull Board at `/admin/queues`

---

## Suggested pace

| Phase | Rough effort |
|---|---|
| 0–1 Skeleton + plumbing | A day. Nest's building blocks, learned properly once. |
| 2 Database | A day. The spike decides how the rest is written. |
| 3–4 Auth + rate limiting | Two days. The most Nest-specific phases. |
| 5 Catalog | A day |
| 6–7 Jobs + cart | A day |
| 8 Checkout | A day. Go carefully, it handles money. |
| 9–12 The rest + ops | Two days |

Start at phase 0 and don't skip ahead. Phase 3's guards depend on phase 1's filter, and phase 8
depends on phase 2's spike having proven that a conditional update returns a row count.
