1. pnpm init
2. pnpm add -D typescript
3. pnpm exec tsc --version
4. pnpm exec tsc --init
5. pnpm add express
6. pnpm add -D @types/express
7. pnpm add express cors dotenv zod morgan
8. pnpm add -D typescript tsx prisma @types/node @types/express @types/cors @types/morgan
9. pnpm exec prisma orm init --target postgres --authoring psl --skip-install  # Prisma 8: scaffolds
   prisma.config.ts, src/prisma/contract.prisma, src/prisma/db.ts (no schema.prisma / PrismaClient any more)
10. pnpm add @prisma/orm-postgres @prisma/cli-engine@0.4.0  # cli-engine must match orm-toolchain's peer
11. Set DATABASE_URL in .env to the Neon pooled connection string (sslmode=require)
12. pnpm exec prisma contract emit  # replaces `prisma generate`; writes contract.json + contract.d.ts
13. pnpm exec prisma db verify --schema-only  # read-only connectivity/drift check
14. pnpm exec prisma db init  # creates the contract's tables in the database (writes to Neon!)
15. pnpm run db:test  # queries db.orm.public.User.first(); needs step 14 first

## Change the schema (edit src/prisma/contract.prisma first)

1. Plan the migration (emits the contract, then writes migrations/app/<timestamp>_<name>/):
   pnpm db:plan <name>            # e.g. pnpm db:plan add_products

2. Read the SQL it will run (the tidy copy is saved as migration.sql by step 3):
   pnpm exec prisma migration show <name>

3. Save migration.sql, apply to Neon, and move the db ref forward (needed for the next plan):
   pnpm db:apply                  # = db:sql + prisma db migrate + prisma db sign

4. Verify Neon matches the contract:
   pnpm exec prisma db verify

If plan says MIGRATION.PLAN_ORIGIN_UNKNOWN, or apply says MIGRATION.PATH_UNREACHABLE, the db ref
(migrations/app/refs/db.json) is behind Neon. Fix it, delete any migration folder planned from the wrong origin, re-plan:
   pnpm exec prisma migration ref set db <hash Neon is at>
Never plan two migrations in a row without applying the first.



 pnpm add morgan
pnpm add -D @types/morgan

pnpm add cookie-parser
pnpm add cookie-parser helmet
pnpm add -D @types/cookie-parser
pnpm add jsonwebtoken
pnpm add -D @types/jsonwebtoken