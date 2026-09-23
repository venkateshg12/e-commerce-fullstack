# Phase 02 — Database: Prisma 8 spike, DbModule, contract, migrations ⭐

**Goal:** a proven Prisma 8 API, one database client injected everywhere, the whole schema in one
contract, and a migration workflow that leaves a readable `migration.sql` behind every change.

**Why now:** every service from phase 3 onward queries the database. What Prisma 8 can and can't do
decides how those services are written, so find out **before** you write them.

---

## Prerequisites
- Phase 01 done
- `apps/backends/postgres` working (it's your reference for the Prisma 8 setup)
- `docker compose up -d postgres` works (the local database for e2e tests)

## Part A — The API spike (do this first, in a scratch file)

Prisma 8's `@prisma/orm-postgres` is a new ORM. From the installed types you know it has
`db.orm.<schema>.<Model>` query builders, `db.transaction(fn)`, `db.sql`, `db.raw`, `db.connect()`
and `db.close()`. Everything else is unconfirmed. Against a two-table contract, prove each of these
and **write down the exact call** in a `SPIKE.md` beside this file:

| # | What later phases need | Used in |
|---|---|---|
| 1 | Insert a row and get it back | everywhere |
| 2 | Update with a condition and **get the affected row count** (`WHERE stock >= n`) | phase 8's oversell guard |
| 3 | Upsert on a composite unique `(cart_id, product_id, color, size)` | phase 7 |
| 4 | A transaction that **rolls back** when the callback throws `AppError` | phases 3, 8 |
| 5 | Load a row with its relations in one query (what `include` was) | phase 5 |
| 6 | `where` with `in`, `gte`, case-insensitive contains, relation-exists filters | phase 5 |
| 7 | `count` for pagination | phase 5 |
| 8 | Raw SQL with parameters, returning typed rows | phase 11 |
| 9 | Delete returning the deleted row (single-use tokens) | phase 3 |

**If a row fails, there's a verified fallback.** `postgres()` accepts a `pg: Pool` option
(`PostgresBindingOptions` in the package types). Create one `pg.Pool`, hand it to Prisma, and use
the same pool for hand-written SQL. One pool, one connection limit, and SQL you fully control. Row 8
is the likeliest to need this: in the Postgres app, `db.raw.sql` returned a plan that needs a row
spec, and that route isn't figured out yet.

## Part B — DbModule

The Prisma client becomes a provider, like any other dependency:

```ts
// src/infra/db/db.module.ts
export const DB = Symbol("DB");
export type Db = PostgresClient<Contract>;   // type exported by @prisma/orm-postgres/runtime

@Global()
@Module({
    providers: [{
        provide: DB,
        inject: [ConfigService],
        useFactory: async (config: ConfigService<Env, true>) => {
            const { default: postgres } = await import("@prisma/orm-postgres/runtime");
            const db = postgres<Contract>({ contractJson, url: config.get("DATABASE_URL", { infer: true }) });
            await db.connect();          // fail at boot, not on the first request
            return db;
        },
    }],
    exports: [DB],
})
export class DbModule implements OnApplicationShutdown {
    constructor(@Inject(DB) private readonly db: Db) {}
    async onApplicationShutdown() { await this.db.close(); }
}
```
Services take it with `constructor(@Inject(DB) private readonly db: Db) {}`.

- **`await import()`** works because phase 0 set `module: nodenext`. If a static
  `import postgres from …` also works under your build, use that instead. Either way, confirm it
  in the spike.
- **`contractJson`**: load `src/prisma/contract.json` with `resolveJsonModule`. Nest's default
  `nest build` doesn't copy JSON: add `"assets": ["prisma/*.json"]` under `compilerOptions` in
  `nest-cli.json`.
- **Delete `src/prisma/db.ts`** that `prisma orm init` generates. It's a second client outside DI.

## Part C — The contract (the whole schema, one pass)

Don't redesign it. **`../postgres/architect/phase-01-schema.md` is the design.** Port it into
`src/prisma/contract.prisma`. The decisions, summarised:

- **17 tables:** users, sessions, verification_links, addresses, categories, sub_categories,
  brands, products, product_variants, product_images, carts, cart_items, wishlist_items, promos,
  orders, order_items, banners.
- **Money is `Int` paise.** Never `Float`.
- **ids are uuid, timestamps are timestamptz.**
- **Order lines snapshot** title, image, unit price, colour and size. The promo code is stored as
  text, not a foreign key.
- **onDelete:** user → orders `Restrict`, product → order_items `SetNull`, category/brand/sub-category
  → products `Restrict`. Everything else that's "part of" its parent is `Cascade`.
- **`@@unique([productId, color, size])`** on variants, plus the indexes that phase 1 of the
  Postgres plan lists.

Prisma 8's contract syntax differs from classic PSL (for example `TimestamptzString` and
`temporal.updatedAtString()`). Check every attribute you use against the emitted `contract.d.ts`,
and read the errors `contract emit` gives you.

Then find out how to add what the contract can't express: the `pg_trgm` index, the
`lower(name)` uniques and the two `CHECK` constraints. `prisma migration new` scaffolds a migration
for manual authoring, so start there.

## Part D — Migrations with a `.sql` file every time

Copy the three scripts from `apps/backends/postgres/package.json` and the helper
`src/scripts/write-migration-sql.ts`:

```json
"db:plan":  "prisma contract emit && prisma migration plan --name",
"db:sql":   "tsx src/scripts/write-migration-sql.ts",
"db:apply": "pnpm run db:sql && prisma db migrate"
```

The loop, every time:
1. Edit `src/prisma/contract.prisma`
2. `pnpm run db:plan add_something`: a new folder in `migrations/app/`
3. Read its `migration.sql`
4. `pnpm run db:apply`: applies it to the database in `DATABASE_URL`

`migration.sql` is a **readable copy** generated from `ops.json`. Prisma applies `ops.json`, so
editing the `.sql` file changes nothing.

## Part E — Seed

`src/scripts/seed.ts`: two categories, two brands, three products with variants, one admin user.
Run it against the local docker database for e2e, and against the Neon branch once. Phase 5 needs
rows to look at.

## NestJS you're practising
Custom providers (`useFactory`, `inject`) · injection tokens (`Symbol`) · `@Global()` modules ·
async providers · lifecycle hooks (`onApplicationShutdown`)

## Tests
- `test/db.e2e-spec.ts` against docker Postgres: each spike row that phase 8 depends on (rows 2
  and 4) becomes a permanent test.
- The Postgres plan's "try to break it" statements (FK violation, duplicate variant, stock −1) as
  e2e tests. All must be refused.

## Checkpoint
```bash
pnpm run db:plan init && pnpm run db:apply
# every table exists on the Neon branch, and migrations/app/*_init/migration.sql is readable
pnpm --filter nestjs-service test:e2e -- db
```

## Pitfalls
- **"No changes detected"** means you ran `db:plan` without editing the contract.
- **Tables missing but Prisma thinks they're there** (it happened in the Postgres app):
  `prisma db verify --schema-only` shows the gap, and `prisma db update --dry-run` shows the fix
  before you run it.
- **Two clients.** One from `DbModule`, one from a leftover `db.ts` or `new Pool()` in a service:
  two pools and double the connections. There's one client, and it's injected.

## Done when
- [ ] `SPIKE.md` lists the exact working call for all 9 rows (or the `pg` fallback used)
- [ ] `DbModule` connects at boot and closes on shutdown
- [ ] All 17 tables, the enums and the hand-written indexes/checks exist
- [ ] Every migration folder has a `migration.sql`
- [ ] The "must be refused" e2e tests pass
