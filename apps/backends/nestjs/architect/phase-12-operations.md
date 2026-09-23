# Phase 12 — Operations

**Goal:** the app cleans up after itself, reports honest health, shuts down without dropping
requests, builds into a container, is checked by CI, and has proven parity with the Mongo backend.

**Why last:** these need the whole app to exist, but a backend without them isn't production-ready.

---

## Prerequisites
- Phases 00–11 done

## 1. The cleanup job (Postgres has no TTL)

Mongo's TTL indexes deleted expired sessions, spent verification links, and cancelled orders after
12 hours. Nothing deletes them now. The full reasoning, including which deletions matter for
correctness and which are only housekeeping, is in `../postgres/architect/phase-10-operations.md`.

**In Nest: a BullMQ repeatable job with a fixed id. Not `@nestjs/schedule`.**
```ts
// runs once at boot, from CleanupScheduler.onApplicationBootstrap()
await this.queue.upsertJobScheduler("cleanup-hourly", { pattern: "0 * * * *" }, { name: "cleanup" });

@Processor("maintenance")
export class CleanupProcessor extends WorkerHost {
    async process() {
        await this.deleteInBatches("sessions",           "expires_at < now()");
        await this.deleteInBatches("verification_links", "expires_at < now()");
        await this.deleteInBatches("orders",             "order_status = 'cancelled' AND cancelled_at < now() - interval '12 hours'");
    }
}
```
- **Why not `@Cron()`:** `@nestjs/schedule` runs in every instance. Three API instances mean three
  cleanups racing. A job scheduler with a fixed id exists once in Redis, however many instances
  register it.
- **Batches:** `DELETE … WHERE id IN (SELECT id … LIMIT 5000)` in a loop until a pass deletes 0 rows.
  Log each count.
- `upsertJobScheduler` is the current BullMQ API. Check it exists in your installed BullMQ; older
  code uses `queue.add(name, data, { repeat, jobId })`.
- **Cancelled orders** involve a user-visible promise ("removed at …"). Decide delete-or-hide as the
  Postgres phase-10 doc describes.

## 2. Health with `@nestjs/terminus`

```ts
@Public() @SkipRateLimit()
@Get("health")
@HealthCheck()
check() {
    return this.health.check([
        () => this.db.isHealthy("postgres"),   // a custom indicator running SELECT 1
        () => this.redis.isHealthy("redis"),   // PING on the queue Redis
    ]);
}
```
- 200 when both are up. 503 with the failing indicator named when not.
- `redis-cache` is **not** in the check: the app works without it (fail-open, phase 10), so a cache
  outage mustn't take the instance out of the load balancer.
- If the platform supports it, split this into `/health/live` (process up, no dependencies) and
  `/health/ready` (dependencies). Keep `/health` for parity.

## 3. Graceful shutdown
`app.enableShutdownHooks()` (phase 0) makes SIGTERM run every `onApplicationShutdown`. Check that
each connection owner closes: `DbModule` (Prisma), `RateLimitService` (Redis), `CacheModule`
(redis-cache). `@nestjs/bullmq` closes its workers and waits for active jobs. Then compare with the
ordering in `mongo/src/index.ts`: stop accepting, drain in-flight requests, close workers, close the
database.

## 4. Container

A multi-stage `Dockerfile` (in this folder). Build with the monorepo root as the context, because
`@repo/types` is a workspace package:
```dockerfile
FROM node:22-slim AS build
WORKDIR /repo
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile --filter nestjs-service...
RUN pnpm --filter nestjs-service build
RUN pnpm --filter nestjs-service deploy --prod /out     # pruned, self-contained node_modules

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /out .
USER node
EXPOSE 5002
CMD ["node", "dist/main.js"]
```
- The image contains **no** `.env`. Configuration comes from the platform's environment.
- `sharp` has native binaries: build on the same OS/architecture you run on.
- **Migrations are a release step, not a boot step.** Run `prisma db migrate` once per deploy, before
  the new version starts. Never in `main.ts`, where three instances would race.

## 5. CI (the steps, whatever the CI provider)
1. `pnpm install --frozen-lockfile`
2. `pnpm --filter nestjs-service lint`
3. `pnpm --filter nestjs-service typecheck`
4. `pnpm --filter nestjs-service test` (unit)
5. Start `postgres` + `redis` services → `prisma db migrate` against them → `test:e2e`
6. Build the Docker image

Every e2e test written in phases 0–11 runs here. The concurrency test from phase 8 is the one you
most want guarding every merge.

## 6. API documentation (optional)
`@nestjs/swagger` (12.x supports Nest 12) can serve an OpenAPI page. With Zod instead of class DTOs,
generating schemas takes extra work (`zod` v4's `z.toJSONSchema()` is one route). Worth doing once
you have consumers other than your own client. Skip it otherwise.

## 7. Parity with the Mongo backend
A script in `test/parity/` that sends the same list of requests to 5000 and 5002 (logged in as the
same test user, over equivalent seed data) and diffs the JSON, ignoring ids and timestamps. Run
it through the finish checklist in `NESTJS_BUILD_PLAN.md` until it's clean.

## NestJS you're practising
Terminus health indicators · lifecycle hooks at shutdown · `onApplicationBootstrap` · BullMQ job
schedulers · building a monorepo package into a container · a CI pipeline for a Nest app

## Checkpoint
```bash
# shutdown: start a slow request, send SIGTERM, the request still completes
# health: stop postgres → /health is 503 naming postgres; stop redis-cache → /health stays 200
# cleanup: insert an expired session and a 13-hour-old cancelled order, trigger the job, both gone
docker build -f apps/backends/nestjs/Dockerfile -t nestjs-service .
docker run --env-file apps/backends/nestjs/.env -p 5002:5002 nestjs-service
```

## Done when
- [ ] The cleanup job runs once per hour however many instances run
- [ ] `/health` reflects Postgres and Redis honestly and ignores the cache
- [ ] SIGTERM drains requests and closes every connection
- [ ] The Docker image builds and runs with no `.env` baked in
- [ ] CI runs lint, typecheck, unit and e2e tests on every change
- [ ] The parity script is clean against the Mongo backend
