# Phase 00 — Skeleton

**Goal:** a Nest app in `apps/backends/nestjs` that boots on port 5002 with typed config and
structured logs, and answers `GET /health`.

**Why first:** nothing can be tested until something runs. It's also where you learn the three
things every later phase depends on: modules, providers and the bootstrap in `main.ts`.

---

## Prerequisites
- Node **≥ 22.12**, because Prisma 8's package is ESM-only (see the gotcha in the overview)
- A **Neon branch** for this app: Neon console → your project → Branches → *Create branch*
  (`nestjs`). Branches share nothing after creation, so the Postgres app's migrations and this
  app's never collide.
- Read the Nest 12 release notes. Note anything that contradicts this plan.

## Files

**Create**
```
apps/backends/nestjs/
├── package.json          name "nestjs-service", engines.node ">=22.12"
├── nest-cli.json
├── tsconfig.json         "module": "nodenext", "moduleResolution": "nodenext", strict
├── .env / .env.example / .env.test
└── src/
    ├── main.ts
    ├── app.module.ts
    ├── config/env.schema.ts
    └── modules/health/{health.module,health.controller}.ts
```

## Steps

1. **Scaffold inside the monorepo, without a nested git repo or lockfile:**
   ```bash
   cd apps/backends
   pnpm dlx @nestjs/cli new nestjs --package-manager pnpm --skip-git --strict
   rm -f nestjs/pnpm-lock.yaml nestjs/pnpm-workspace.yaml   # the root workspace owns these
   cd ../.. && pnpm install
   ```
   Rename the package to `nestjs-service` so `pnpm --filter nestjs-service dev` works. Turborepo
   picks it up from `apps/backends/*`. Add a `typecheck` script (`tsc --noEmit`) to match the other
   packages.

2. **Use `nodenext` module settings.** Nest compiles to CommonJS. With `nodenext`, TypeScript keeps
   `await import()` as a real dynamic import, which phase 2 may need for the ESM-only Prisma package.

3. **Typed, fail-fast config.** Replace `constants/env.ts` with a Zod schema. Start with only what
   this phase needs and add variables as each phase needs them:
   ```ts
   // src/config/env.schema.ts
   export const envSchema = z.object({
       NODE_ENV: z.enum(["development", "test", "production"]),
       PORT: z.coerce.number().default(5002),
       CORS_ORIGIN: z.string().min(1),
       DATABASE_URL: z.url(),
   });
   export type Env = z.infer<typeof envSchema>;
   ```
   ```ts
   // app.module.ts
   ConfigModule.forRoot({ isGlobal: true, cache: true, validate: (raw) => envSchema.parse(raw) })
   ```
   Inject it as `ConfigService<Env, true>` and read with `config.get("PORT", { infer: true })`.
   You get a typed value, and the app refuses to boot on a missing variable, the same as
   `env.ts` today.

4. **Logging.** `nestjs-pino` with `pino-http`: pretty in dev, JSON in production, a request id on
   every line (`genReqId: (req) => req.headers["x-request-id"] ?? randomUUID()`). Then call
   `app.useLogger(app.get(Logger))`. Redact `req.headers.cookie` and `req.headers.authorization`.

5. **`main.ts`, in this order:**
   ```ts
   import { setDefaultResultOrder } from "node:dns";
   import { setDefaultAutoSelectFamily } from "node:net";
   // Same WSL2 fix as apps/backends/postgres/src/config/db.ts: no IPv6 route, so pin IPv4
   setDefaultResultOrder("ipv4first");
   setDefaultAutoSelectFamily(false);

   const app = await NestFactory.create<NestExpressApplication>(AppModule, {
       bufferLogs: true,
       rawBody: true,                 // phase 8's webhook needs the exact bytes
   });
   app.useLogger(app.get(Logger));
   app.set("trust proxy", /* the value mongo/src/index.ts computes from TRUSTED_PROXY_CIDRS */);
   app.use(helmet());
   app.use(cookieParser());
   app.enableCors({ origin: corsOrigins, credentials: true });
   app.enableShutdownHooks();
   await app.listen(config.get("PORT", { infer: true }));
   ```
   Don't set a global prefix. The Mongo routes have none, and the one rule says the paths stay
   identical.

6. **`/health` for now:** a `@Public()` controller that returns `{ status: "ok" }`. Phase 12 swaps
   it for terminus with real checks. `@Public()` does nothing until phase 3. Add it anyway, so you
   don't forget it later.

## NestJS you're practising
Modules and the module graph · providers and constructor injection · `ConfigModule` · the
bootstrap sequence · why `NestExpressApplication` gives you `app.set(...)`

## Tests
- Keep the scaffolded `app.controller.spec.ts` pattern and write `health.controller.spec.ts` with
  `Test.createTestingModule`.
- `test/health.e2e-spec.ts`: `GET /health` returns 200.

## Checkpoint
```bash
pnpm --filter nestjs-service dev
curl -i localhost:5002/health             # 200, one JSON log line with a request id
DATABASE_URL= pnpm --filter nestjs-service dev   # refuses to boot, names the variable
```

## Pitfalls
- **A nested `pnpm-lock.yaml`** from the scaffold makes pnpm treat the folder as its own workspace.
  Delete it.
- **Port clash.** 5000 and 5001 are taken by the other two backends.
- **Don't add `ValidationPipe` / class-validator** from Nest tutorials. Validation is Zod (phase 1).

## Done when
- [ ] `pnpm --filter nestjs-service dev` boots on 5002
- [ ] A missing env var stops the boot with a clear message
- [ ] Logs are JSON in production mode and carry a request id
- [ ] `/health` returns 200, with a unit test and an e2e test
