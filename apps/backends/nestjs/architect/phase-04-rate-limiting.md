# Phase 04 — Rate limiting

**Goal:** the same limits as the Mongo backend (same keys, windows, lockouts, headers), enforced
by a Nest guard, with the Redis store, in-memory fallback and circuit breaker unchanged.

**Why now:** auth is live since phase 3, and login without a limiter is an open door.

---

## Prerequisites
- Phase 03 done
- Redis on 6379 (`docker compose up -d redis`), plus `REDIS_HOST` / `REDIS_PORT` in the env schema

## The decision: wrap the existing limiter, don't replace it with `@nestjs/throttler`

`@nestjs/throttler` is what you'd reach for on a new app, and it's worth knowing: named throttlers,
`getTracker`, `blockDuration`, a pluggable `ThrottlerStorage`. But the limiter in
`mongo/src/middleware/rateLimiter.ts` + `config/rateLimiter.ts` already does more, and every piece
of it was added for a reason:

| Existing behaviour | Why throttler is a poor fit |
|---|---|
| **Dual atomic bucket** (`globalLimiter`: 500 per visitor **and** 2000 per IP, one Lua call) | Throttler counts one key per throttler, so the two checks aren't atomic |
| **Three axes on login** (ip+email punitive, email non-punitive, source): first rejection wins | Possible with three named throttlers, but each route then runs every throttler unless you write skip logic |
| **Per-limiter key resolvers** (email from the body, session id from the refresh cookie) | Needs a custom tracker per throttler |
| **Fail-open circuit breaker + in-memory fallback** | Would need re-implementing inside a custom storage |

So the store, breaker and Lua scripts (`utils/rateLimiter/*`) are **copied verbatim**, and only the
Express-specific wrapper becomes Nest code.

## Files

**Copy verbatim:** `mongo/src/utils/rateLimiter/*`, `constants/rateLimiter.constant.ts`,
`config/rateLimiter.ts` (the limiter **configs**: prefix, window, max, block, key resolver).

**Create**
```
src/infra/redis/redis.module.ts          the queue Redis connection as a provider (reused in phase 6)
src/common/rate-limit/rate-limit.module.ts   RateLimitService: owns the Redis + memory stores and the breaker
src/common/rate-limit/rate-limit.guard.ts
src/common/rate-limit/rate-limit.decorator.ts
src/common/middleware/visitor-id.middleware.ts   copied from mongo/src/middleware/visitorId.ts
```

## Steps

1. **Split the factory.** Today `createRateLimiter(options)` returns an Express handler. Pull its
   body into `RateLimitService.check(options, req): Promise<RateLimitResult>`, a plain function
   that counts and decides, and set the headers from the result in the guard. The Lua scripts and
   stores don't change.

2. **The decorator lists the limiters a route needs, in the order they run:**
   ```ts
   export const RATE_LIMITS = "rateLimits";
   export const RateLimit = (...limits: LimiterConfig[]) => SetMetadata(RATE_LIMITS, limits);

   @Public()
   @RateLimit(limits.loginSource, limits.loginAccount, limits.login)
   @Post("login")
   login(…) {}
   ```
   Copy each route's list straight from `mongo/src/routes/*.ts`. Take `/auth/login` for example:
   `loginSourceLimiter, loginAccountLimiter, loginLimiter`.

3. **The guard** runs the global dual limiter on every request, then the route's own limiters, and
   stops at the first rejection:
   ```ts
   @Injectable()
   export class RateLimitGuard implements CanActivate {
       async canActivate(ctx: ExecutionContext) {
           const req = ctx.switchToHttp().getRequest<Request>();
           const res = ctx.switchToHttp().getResponse<Response>();
           const limits = this.reflector.getAllAndOverride<LimiterConfig[]>(RATE_LIMITS, [ctx.getHandler(), ctx.getClass()]) ?? [];
           for (const limit of [globalLimit, ...limits]) {
               const result = await this.rateLimit.check(limit, req);
               setRateLimitHeaders(res, result);
               appAssert(result.allowed, TOO_MANY_REQUESTS, "Too many requests", AppErrorCode.RATE_LIMITED);
           }
           return true;
       }
   }
   ```
   Use whatever error code and message the Mongo middleware sends today, so the client's handling
   doesn't change.

4. **Account limiters read the body.** Guards run after body parsing, so `req.body.email` is
   available to `emailKeyResolver` exactly as it was.

5. **Register it first:** `APP_GUARD` `RateLimitGuard`, then `AuthGuard`, then `RolesGuard`. A
   request with a bad token still counts toward the limit.

6. **`visitorId` middleware** in `AppModule.configure(consumer)` with
   `consumer.apply(VisitorIdMiddleware).forRoutes("*")`. It must run before the guard, which it
   does, because middleware always runs before guards.

7. **Webhook exemption.** In Mongo, the Razorpay webhook is mounted before the global limiter.
   Mark `/webhooks/razorpay` with a `@SkipRateLimit()` decorator, so Razorpay's retries are never
   throttled.

8. **Shutdown:** `RateLimitService.onApplicationShutdown` disconnects its Redis client.

## NestJS you're practising
Guards that do I/O · metadata arrays from decorators · middleware vs guards (when each runs) ·
`MiddlewareConsumer` · owning a connection's lifecycle in a provider

## Tests
- `rate-limit.guard.spec.ts` with a fake `RateLimitService`: order of evaluation, first rejection
  wins, headers set on allowed and rejected requests.
- e2e: 11 bad logins → the 11th is 429 with `Retry-After`. Stop Redis → requests still pass (the
  in-memory fallback), then start it again.

## Checkpoint
```bash
for i in $(seq 1 11); do curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:5002/auth/login \
  -H 'content-type: application/json' -d '{"email":"a@b.co","password":"wrong-password"}'; done
# ten 401s, then 429, with the same headers the Mongo backend sends
```

## Pitfalls
- **`trust proxy` wrong** → every request looks like it comes from the proxy's IP, and one user
  locks everyone out. It was set in phase 0 from `TRUSTED_PROXY_CIDRS`. Verify `req.ip` in the logs.
- **Two Redis clients for one instance.** Rate limiting and BullMQ both use the 6379 Redis. Share
  the `RedisModule` connection where the library allows it.

## Done when
- [ ] Every route has the same limiter list as its Mongo route
- [ ] 429 responses and rate-limit headers match the Mongo backend
- [ ] The app keeps serving with Redis down (fail-open), and logs the breaker opening
