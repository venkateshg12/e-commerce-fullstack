# Phase 03 — Redis and rate limiting

**Goal:** the auth endpoints are protected before anything else is built on them.

**Why now:** it's an afternoon of copying, it hardens the phase you just finished, and it proves the
storage-agnostic layer ports cleanly.

---

## Prerequisites
- Phase 02 done
- The `redis` container from the root `docker-compose.yml` running on `6379`

## Files — all copied verbatim, nothing rewritten

```
utils/rateLimiter/{redisStore,memoryStore,circuitBreaker,luaScript,ipExtractor,index}.ts
config/redis.ts
config/rateLimiter.ts
middleware/rateLimiter.ts
middleware/visitorId.ts
types/rateLimiter.types.ts
constants/rateLimiter.constant.ts
```

None of it touches the database. Copy, add the env vars, uncomment the limiters in
`routes/auth.route.ts`.

## What you're inheriting (worth understanding, not rewriting)

- **Three axes on login**, because one isn't enough: per (IP, email), per email, per IP. One account
  attacked from many IPs and one IP walking many accounts are different attacks.
- **The account-axis limiter is deliberately not punitive** — a lockout keyed on an email lets anyone
  lock anyone else out.
- **Redis-backed sliding window in Lua**, so check-and-increment is atomic.
- **Circuit breaker + in-memory fallback**: if Redis dies, requests are still limited per process
  rather than failing.
- **`extractClientIp` only trusts proxy headers from CIDRs you list** in `TRUSTED_PROXY_CIDRS`.
  Behind a load balancer with this empty, every visitor shares one bucket.

## Steps
1. Copy the files, add `REDIS_HOST`, `REDIS_PORT`, `TRUSTED_PROXY_CIDRS` to `constants/env.ts`.
2. Mount `visitorIdMiddleware` and `globalLimiter` in `index.ts`, in the same order as the Mongo
   backend (after `cookieParser`, before the routes).
3. Re-enable the per-route limiters on `routes/auth.route.ts`.

## Checkpoint
```bash
for i in $(seq 1 12); do
  curl -s -o /dev/null -w "%{http_code} " -X POST localhost:5001/auth/login \
    -H 'content-type: application/json' \
    -d '{"email":"nobody@example.com","password":"wrongpassword"}'
done; echo
# expect 401s, then 429
redis-cli -p 6379 --scan --pattern 'rl:*' | head
docker compose stop redis   # requests still work, limited in-memory
docker compose start redis
```

## Pitfalls
- **Two Redis instances on purpose:** `6379` (`noeviction`) for queues and limits, `6380`
  (`volatile-lru`) for the cache in phase 08. Never point the cache at 6379 — a full cache would
  start refusing queue writes.
- Rate limits sit **after** `express.json()` (they read `req.body.email`) but **before** the routes.

## Done when
- [ ] Repeated bad logins return 429
- [ ] Keys appear under `rl:` in Redis
- [ ] With Redis stopped, requests still succeed (and are still limited)
