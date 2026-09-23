# Phase 02 — Auth

**Goal:** register → verify email → login → refresh → logout, working in the real React client.

**Why now:** every later phase needs a logged-in user. This is also where the security work already
done in the Mongo backend has to survive the port — don't simplify it.

---

## Prerequisites
- Phase 01 done (`users`, `sessions`, `verification_links` exist)
- Resend (or SMTP) credentials in `.env`, or accept that verification links only appear in the log

## Files

**Copy verbatim from `../mongo/src`:**
```
utils/auth/{jwt,bcrypt,cookies,verificationToken,index}.ts
utils/date/*
middleware/authenticate.ts        (swap the session lookup for Prisma)
middleware/requireAdmin.ts        (swap the user lookup for Prisma)
controllers/auth.controller.ts
controllers/session.controller.ts
routes/auth.route.ts              (comment out the rate limiters until phase 03)
routes/session.route.ts
types/auth.types.ts
```

**Rewrite:** `services/auth.service.ts` — same exported functions, Prisma queries inside.

## The security properties that must survive the port

Port these deliberately; each one exists because of a real hole that was found and closed:

1. **Access tokens are checked against a live session.** `authenticate` verifies the JWT *and*
   confirms the session row still exists and hasn't expired. Without it, logout doesn't log anyone
   out for up to 15 minutes.
2. **Refresh-token rotation with reuse detection.** Each refresh issues a new token and invalidates
   the old one. A replayed token means it was copied → revoke the whole session. Keep the ~30s
   grace window so two browser tabs refreshing together don't sign the user out.
3. **The dummy-hash compare.** When the email is unknown, still run bcrypt against a throwaway hash
   so response timing doesn't reveal which emails are registered.
4. **Verification and reset tokens are stored hashed** (SHA-256), never in plaintext. The raw token
   exists only in the email.
5. **Single-use links, atomically.** Find-and-delete in one statement so two clicks can't both
   succeed:
   ```ts
   const link = await prisma.verificationLink.delete({
       where: { token: hashOf(raw), type: "email_verification", expiresAt: { gt: new Date() } },
   }).catch(() => null);
   ```
6. **One revocation path.** Every place that ends a session goes through `revokeSessions()` — never
   a bare `prisma.session.deleteMany`. Phase 08 adds a session cache that depends on this.

## Steps

1. Port `utils/auth/*` unchanged — it's pure crypto and cookie logic, no database.
2. Rewrite `auth.service.ts` function by function, in this order:
   `createAccount` → `verifyEmail` → `loginUser` → `refreshUserAccessToken` → `logout` →
   `revokeSessions` → profile/password functions.
3. For rotation, use a conditional update so two concurrent refreshes can't both rotate:
   ```ts
   const { count } = await prisma.session.updateMany({
       where: { id: sessionId, refreshJti: presentedJti },      // only if still current
       data: { refreshJti: newJti, prevRefreshJti: presentedJti, rotatedAt: new Date() },
   });
   if (count === 0) { /* grace window, else revoke the session */ }
   ```
4. Wire `authenticate` to Prisma (`findUnique` on the session, check `expiresAt`).
5. Point the client's `VITE_API_URL` at `:5001` and use the real UI.

## Postgres you're practising
Unique constraints as the real guard against duplicate accounts · `delete` returning the row ·
conditional `updateMany` as compare-and-swap · transactions for "create user + issue link"

## Checkpoint
Do it through the browser, then confirm in psql:
```sql
SELECT email, verified, auth_provider, role FROM users;
SELECT id, user_id, refresh_jti, prev_refresh_jti, expires_at FROM sessions;
SELECT type, expires_at FROM verification_links;      -- empty after the link is used
```
Then the security behaviours:
- Log in, copy the `accessToken` cookie, log out, call `/auth/me` with the old cookie → **401**
- Call `/auth/refresh` twice with the *same* refresh cookie, 60s apart → second is **401** and the
  session row is gone
- Register with an email that exists → **409**, and no second row appears

## Pitfalls
- **Don't drop the session lookup** in `authenticate` "for speed". Phase 08 adds the cache that
  makes it cheap.
- **Cookies:** `httpOnly`, `sameSite`, `secure` outside development, and the refresh cookie scoped
  to its own path — copy the Mongo settings exactly.
- **`prisma.delete` throws when nothing matches.** Use `deleteMany` or `.catch(() => null)` where a
  miss is expected.

## Done when
- [ ] Register, verify, login, refresh, logout all work from the React client
- [ ] The three security checks above behave as described
- [ ] `/session` lists your devices and `DELETE /session/:id` kills one
- [ ] No `prisma.session.delete*` call exists outside `revokeSessions`
