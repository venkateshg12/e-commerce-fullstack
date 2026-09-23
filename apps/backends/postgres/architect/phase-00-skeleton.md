# Phase 00 — Skeleton

**Goal:** an Express server in `apps/backends/postgres` that boots, connects to Postgres, and
answers `GET /health`.

**Why first:** nothing can be tested until something runs. Keep this phase boring.

---

## Prerequisites
- Docker running (for the Postgres container)
- The Mongo backend still works — it is your reference for every file you copy

## Files

**Create**
```
apps/backends/postgres/
├── package.json            name: "postgres-service", scripts mirroring ../mongo
├── tsconfig.json           copy ../mongo/tsconfig.json as-is
├── .env.example
├── .env                    your real values, git-ignored
├── prisma/schema.prisma    from `npx prisma init` (left almost empty this phase)
└── src/
    ├── index.ts
    ├── config/db.ts
    ├── constants/          copy verbatim
    └── utils/{api,errors}/ copy verbatim
```

**Copy verbatim from `../mongo/src`:** `constants/https.ts`, `constants/appErrorCode.ts`,
`utils/api/*`, `utils/errors/*`, `middleware/errorHandler.ts`, `middleware/notFound.ts`.

Take `constants/env.ts` too, then strip it to what this phase needs (`PORT`, `NODE_ENV`,
`DATABASE_URL`, `CORS_ORIGIN`) and add the rest back as each phase needs it. Keep its behaviour of
throwing at startup on a missing variable — that is why misconfiguration never reaches production.

## Steps

1. **Add Postgres to the root `docker-compose.yml`**, beside the two Redis services. Use port
   `5432`, a named volume, and a database called `shopymart`.
2. **`pnpm init` the workspace package.** Name it `postgres-service` so it doesn't clash with
   `auth-service`. Give it the same `dev` / `build` / `typecheck` scripts as the Mongo package —
   Turborepo picks it up automatically from `apps/backends/*`.
3. **Install:** `express`, `cookie-parser`, `cors`, `helmet`, `morgan`, `zod`, `@repo/types`,
   `@prisma/client`; dev: `prisma`, `tsx`, `typescript`, the `@types/*`.
4. **`npx prisma init`** — it writes `prisma/schema.prisma` and adds `DATABASE_URL` to `.env`.
   Point that URL at the Docker container.
5. **`src/config/db.ts`** — export one `PrismaClient` for the whole process. One client, not one per
   request: each client owns a connection pool, and creating them per request exhausts Postgres.
6. **`src/index.ts`** — copy the Mongo one, delete every route import, and keep: helmet, cors,
   `express.json`, cookie-parser, morgan, `/health`, `notFound`, `errorHandler`. Listen on a
   **different port to the Mongo backend** (5001) so both can run at once.
7. **Make `/health` mean something:** `await prisma.$queryRaw\`SELECT 1\`` and return 503 if it fails.

## Postgres you're practising
- What a connection pool is, and why one client per process
- `DATABASE_URL` anatomy: `postgresql://user:password@host:5432/dbname?schema=public`

## Checkpoint
```bash
docker compose up -d postgres
psql postgresql://shopymart:shopymart@localhost:5432/shopymart -c '\l'   # your db is listed
pnpm --filter postgres-service dev
curl localhost:5001/health                                              # 200, mongo: "up"
docker compose stop postgres && curl -i localhost:5001/health           # 503
docker compose start postgres
```

## Pitfalls
- **Two servers, two ports.** If 5001 is missing from `CORS_ORIGIN` handling or the client `.env`,
  you'll chase phantom CORS errors later.
- **Don't design the schema yet.** Phase 1 does it in one pass, on purpose.

## Done when
- [ ] `docker compose up -d postgres` gives you a running database
- [ ] `pnpm --filter postgres-service dev` boots with no errors
- [ ] `/health` returns 200 normally and 503 with Postgres stopped
- [ ] An unknown route returns the same 404 envelope as the Mongo backend
