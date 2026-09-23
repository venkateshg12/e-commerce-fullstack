# Phase 03 — Auth ⭐

**Goal:** register → verify email → login → refresh → logout → profile, working in the real React
client, with every security property of the Mongo backend intact.

**Why now:** every later module needs a logged-in user. This is also the most Nest-specific phase:
guards, custom decorators, and cookies through `passthrough`.

---

## Prerequisites
- Phase 02 done (`users`, `sessions`, `verification_links` exist)
- `JWT_SECRET`, `JWT_REFRESH_SECRET` (≥ 32 chars, different), `GOOGLE_CLIENT_ID` added to
  `env.schema.ts`. Put the length and different-values rules from `mongo/src/constants/env.ts`
  into the Zod schema with `.min(32)` and a `.refine`.

## Files

**Copy verbatim:** `mongo/src/utils/auth/{jwt,bcrypt,cookies,verificationToken}.ts` →
`src/modules/auth/lib/`. They're pure functions, and `cookies.ts` only needs Express's `Response`
type, which is what `@Res({ passthrough: true })` gives you.

**Create**
```
src/modules/auth/      auth.module.ts, auth.controller.ts, auth.service.ts, google.service.ts
src/modules/sessions/  sessions.module.ts, sessions.controller.ts, sessions.service.ts
src/modules/users/     users.module.ts, users.service.ts   (the /auth/me routes live in auth.controller)
src/common/guards/     auth.guard.ts, roles.guard.ts
src/common/decorators/ public.decorator.ts, roles.decorator.ts, current-user.decorator.ts
```

## The guards and decorators

**Secure by default.** `AuthGuard` is global, so a route you forget to annotate is protected, not
open. `@Public()` opts a route out.

```ts
export const IS_PUBLIC = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC, true);

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(private readonly reflector: Reflector, private readonly sessions: SessionsService) {}

    async canActivate(ctx: ExecutionContext) {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()]);
        if (isPublic) return true;

        const req = ctx.switchToHttp().getRequest<Request>();
        const payload = verifyAccessToken(req.cookies?.accessToken);  // throws AppError 401
        await this.sessions.assertActive(payload.sessionId);           // property 1 below
        req.user = { userId: payload.userId, sessionId: payload.sessionId, role: payload.role };
        return true;
    }
}

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext) =>
    ctx.switchToHttp().getRequest<Request>().user);
```

- `RolesGuard` reads `@Roles("admin")` the same way and compares with `req.user.role`. Use it on
  every `/admin/*` route, `/promos` writes, `/dashboard/*` and `/orders/:orderId/status`.
- Type `req.user` once with a declaration merge in `src/types/express.d.ts`, the way
  `mongo/src/types/express.d.ts` types `req.userId`.
- Register the order explicitly: `APP_GUARD` throttler (phase 4) → `AuthGuard` → `RolesGuard`.

**Which routes are `@Public()`:** `/health`, `/home`, `/products*` reads, `/categories`, `/brands`,
`/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/verify/*`,
`/auth/password/*`, `/auth/google`, `/webhooks/razorpay`. Everything else needs a session. That
includes the cart and wishlist (see `mongo/src/routes/cart.route.ts`).

## The security properties that must survive the port

These are the same six as in `../postgres/architect/phase-02-auth.md`. Each exists because of a
real hole that was found and closed:

1. **Access tokens are checked against a live session**, not just their signature. Otherwise
   logout doesn't log anyone out until the token expires.
2. **Refresh-token rotation with reuse detection**, with the ~30s grace window for two tabs
   refreshing together.
3. **Dummy-hash compare** for unknown emails, so response timing doesn't reveal which emails are
   registered.
4. **Verification and reset tokens are stored hashed** (SHA-256).
5. **Single-use links, atomically:** delete-and-return in one statement (spike row 9).
6. **One revocation path:** `SessionsService.revokeSessions()`. Phase 10 adds a session cache that
   only this function clears.

## Cookies

```ts
@Public()
@Post("login")
async login(@Body(new ZodValidationPipe(LoginInSchema)) body: LoginInput,
            @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { user, accessToken, refreshToken } = await this.auth.login(body, meta(req));
    setAuthCookies({ res, accessToken, refreshToken });  // copied from mongo utils/auth/cookies
    return user;                                          // the interceptor wraps it
}
```
The refresh cookie keeps `path: "/auth/refresh"`. That's why the filter clears cookies on that path
(phase 1).

## Steps
1. `SessionsService`: `create`, `assertActive`, `rotate`, `revokeSessions`, `listForUser`.
2. `AuthService`, in this order: `register` → `verifyEmail` → `login` → `refresh` → `logout` →
   `forgot/reset password` → `google`.
3. Emails: until phase 6, a `MailService` that **logs** the link. Phase 6 makes it enqueue a job.
   The call sites don't change.
4. `/auth/me` (get/patch), `/auth/me/password`. `/auth/me/avatar` needs uploads: stub it until
   phase 6.
5. `/session` list and revoke (revoke calls `revokeSessions`).

## NestJS you're practising
Guards · `Reflector` + `SetMetadata` · `getAllAndOverride` (method beats class) · custom parameter
decorators · global guards via `APP_GUARD` · `@Res({ passthrough: true })`

## Tests
- `auth.guard.spec.ts`: public route, missing cookie, bad signature, revoked session, valid.
- `auth.service.spec.ts` with fakes: refresh reuse revokes the session, the grace window allows a
  second refresh, and the dummy compare runs for unknown emails.
- e2e: the full flow with a cookie jar (`supertest.agent`), plus "logout, then the old access
  token is rejected".

## Checkpoint
Register in the browser against port 5002, click the logged link, log in, reload (refresh works),
log out, then check the session rows on the Neon branch.

## Pitfalls
- **Forgetting `@Public()` on `/auth/refresh`**: the guard rejects the expired access token, and
  nobody can ever refresh.
- **Throwing `UnauthorizedException`** instead of `AppError`: the client loses the `appErrorCode`
  it switches on.
- **`@Res()` without passthrough** on login: the client gets no body.

## Done when
- [ ] The whole auth flow works from the React client on 5002
- [ ] All six security properties hold, each covered by a test
- [ ] Every non-public route returns 401 without a session and 403 without the admin role
