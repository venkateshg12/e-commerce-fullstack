# Cold-start UX (client)

Backend is on a free tier that sleeps when idle; a cold start takes 30–60 s. Visitors currently get the
fallback hero with no products and nothing retries. Full plan: `~/.claude/plans/cheerful-stargazing-plum.md`.

Root cause: `API` timeout is 15 s, `queryClient` has `retry: false`, so `/home` fails once and stays failed.

## Checklist

- [x] 1. `store/server.store.ts` — `waking | ready` status (+ `wasWaking`)
- [x] 2. `lib/api.ts` — timeout 60 s; slow-request timer → `waking`; non-gateway response → `ready`
- [x] 3. `lib/queryClient.ts` — retry only status 0 / 502 / 503 / 504 (max 5, backoff); refetch errored queries on `waking → ready`
- [x] 4. `components/common/ServerWakeNotice.tsx` + `.server-notice*` CSS; mount in `main.tsx`
- [x] 5. `--skeleton` token; `Skeleton` and `.product-card-media` use it
- [x] 6. `Home.tsx` — error + retry block instead of fallback hero on a failed feed
- [x] 7. `components/common/LazyImage.tsx`; swap storefront `<img>` tags
- [x] 8. Route-level code splitting (`React.lazy` + `Suspense` in both layouts)
- [x] 9. typecheck / lint / build; cold-start simulation with a delaying proxy

## Review

- typecheck and build pass; lint reports 40 errors, all in files this change doesn't touch.
- Cold-start simulation (mock backend answering 503 for 14 s, then healthy) in headless Chromium, desktop and 390 px:
  grey skeletons from t=1 s, "Waking up our server" card from ~t=1 s, no fallback hero, 4 product cards fill in
  once the server answers, card shows "Server is ready" then leaves. A hanging server raises the card at ~3 s.
- Found during testing: `AuthLoader`'s full-screen splash hid the skeletons for the whole wake. It now steps aside
  once the server is waking, and `ProtectedRoute`/`PublicRoute` show a skeleton instead of `null` until auth resolves.
- Not done: a keep-alive pinger on the backend `/health` (host-side, user's call).

# CI + stop redeploying both apps on every push

Plan: `~/.claude/plans/cheerful-stargazing-plum.md`

- [x] `.github/workflows/ci.yml` — build + typecheck (affected-only on PRs, full on main), lint non-blocking, postgres-service excluded
- [x] `turbo.json` — `typecheck` depends on `^build` so `@repo/types` has a `dist` on a clean checkout
- [ ] (you) Render: Build Filters → Included Paths `apps/backends/mongo/**`, `packages/types/**`, `pnpm-lock.yaml`, `package.json`, `pnpm-workspace.yaml`
- [ ] (you) Vercel: enable "skip unchanged" or set Ignored Build Step (see plan)
- [ ] (you) Optional: GitHub branch protection requiring the `ci` check

## Review

- Clean copy (no node_modules, dist or .env) with `pnpm install --frozen-lockfile`, then `turbo run build typecheck --filter='!postgres-service'`: 7/7 tasks pass, so no env vars are needed in CI.
- Without the turbo.json change, `auth-service` typecheck fails on a clean tree (`Cannot find module '@repo/types'`) — confirmed.
- `--affected` with a client-only change runs only client + its build deps, not auth-service.
- Lint fails in `client` (existing errors) and is non-blocking in the workflow.
- Not verified: the workflow on real GitHub runners (no `actionlint` available here); first PR will be the real test.

# Storefront redesign (customer pages only)

Inspiration: `inspiration/*.png`, `design-preferences/shop-style-reference.md`, `design-preferences/teepublic-style-reference.md`.

Direction: Shop's soft canvas (mist page, white floating cards, pill controls, shadow instead of borders) + TeePublic's
marketplace structure (pill category nav, chips, tinted bands, dark footer). One violet accent
(#5433eb) and midnight ink (#151523) for text. Inter body, Geist display.

Scope rule: every override lives in `src/storefront.css` under `html.storefront`, toggled by `UserLayout`, so the admin
panel keeps its current look. The cursor rule is global (buttons, links, selects, tabs).

- [x] A. Foundation: `storefront.css` tokens/fonts/primitives, `UserLayout` toggle, footer, global cursor rule
- [x] B. Header: pill search with violet submit, round icon buttons, category pill row, mobile nav
- [x] C. Home: hero, categories, coupons, new arrivals, trust band
- [x] D. Collections + filters, product cards
- [x] E. Product details
- [x] F. Cart, checkout, wishlist, orders, account, auth modals
- [x] G. Verify: typecheck, build, screenshots (desktop + 390px) against a mock backend

## Review

- Foundation, header, home, collections, product page, cart, checkout, wishlist, orders, account and the auth modal are restyled.
  All overrides are in `src/storefront.css` under `html.storefront`, set by `UserLayout`, so the admin panel is unchanged.
- New pieces: `CategoryPills`, `SiteFooter`, `HomeTrustBand`. Collections' "New Collections" eyebrow removed.
- Cursor: one global rule (buttons, links, tabs, selects, menu items, checkboxes); disabled controls get `not-allowed`.
  Checked in the browser: category pills, search button, product card link and image, login button all resolve to `pointer`.
- Checked with a mock backend in headless Chromium at 1280px and 390px (no horizontal overflow after the pill-row width fix).
- Not covered: Razorpay payment popup, order-success page, admin pages (deliberately untouched).

# Gmail API sender (mongo backend)

Sends from noreply.gvprojects@gmail.com via the Gmail API + a stored OAuth refresh token. Separate Google
Cloud project ("GV Email Service") from Google sign-in (`GOOGLE_CLIENT_ID`). Scope: `gmail.send` only.

- [x] `googleapis` added to `auth-service` (pnpm)
- [x] `constants/env.ts` + `.env.example` — `GMAIL_*` (all optional so the server boots before the token exists)
- [x] `config/gmail.ts` — single lazy OAuth2 client, scope, fixed sender address
- [x] `services/gmail.service.ts` — `sendEmail`, MIME builder, Google error mapping, auth URL + code exchange
- [x] `controllers/gmailAuth.controller.ts` + `routes/gmail.route.ts`, mounted at `/api/auth/gmail` in `index.ts`
- [x] typecheck; stubbed-Google tests of service and routes (dev + production gating)
- [ ] (you) one-time authorization → paste `GMAIL_REFRESH_TOKEN` → send a real test mail
- [ ] (you, optional) point `utils/email/sendMail.ts` (Resend) at `sendEmail` so verification/reset mails go via Gmail

## Review

- Not exercised against real Google (no credentials here): token exchange and `messages.send` were tested with
  `fetch` stubbed at the OAuth client's transporter. The MIME output parses with zero defects in Python's strict parser.
- gaxios 7 uses `node-fetch`, not global `fetch`; stub via `client.transporter.defaults.fetchImplementation`.
- `googleapis` costs ~0.45 s at require time and 241 MB on disk. `@googleapis/gmail` would be ~10x lighter if cold start matters.
