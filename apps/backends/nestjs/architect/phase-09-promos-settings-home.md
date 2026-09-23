# Phase 09 — Promos, settings (banners) and home feed

**Goal:** the remaining feature modules: promo codes (admin CRUD, active list, apply), homepage
banners (admin upload/delete), and the public `/home` feed.

**Why now:** they're small and depend on things that now exist: products, uploads, checkout's
promo handling.

---

## Prerequisites
- Phases 06 (uploads) and 08 (checkout reads promos) done

## Files
```
src/modules/promos/    promos.module.ts, promos.controller.ts, promos.service.ts
src/modules/settings/  settings.module.ts, settings.controller.ts, settings.service.ts
src/modules/home/      home.module.ts, home.controller.ts, home.service.ts
```

## Promos
- Routes: `GET /promos` (admin), `GET /promos/active` (any logged-in user), `POST /promos` (admin),
  `POST /promos/apply` (logged-in, with the `promoApply` limiter), `PATCH /promos/:id` and
  `DELETE /promos/:id` (admin).
- **Mixed roles in one controller:** put `@Roles("admin")` on the admin **methods**, not the class.
  `getAllAndOverride` in `RolesGuard` reads the method first, so no annotation means any
  authenticated user.
- **"Active" is a query, not a flag:** `starts_at <= now() AND ends_at >= now() AND count > 0`.
  `apply` validates with the same condition and returns the discount. It **never** decrements:
  only `fulfillPaidOrder` spends a promo (phase 8).
- **Promo codes are unique case-insensitively:** a `lower(code)` unique index, with `23505` → 409
  through the phase-5 pg-error helper.
- Deleting a promo never touches orders: orders store the code as text (phase 2 design).

## Settings: banners
- Routes: `GET|POST /settings/banners`, `GET|POST /admin/settings/banners`,
  `DELETE /settings/banners/:id`. All are admin-only in the Mongo backend (both path styles exist
  because the client moved between them). One controller method can carry two paths:
  `@Get(["settings/banners", "admin/settings/banners"])`.
- Upload with `FilesInterceptor("images", 10, bannerUploadOptions)` → Cloudinary via
  `StorageService` → rows in `banners`.
- Delete: remove the row, **then** the Cloudinary asset. If Cloudinary fails, log it and still
  return success: an orphaned asset costs cents, a dangling row breaks the homepage.

## Home feed
`GET /home` is `@Public()` with the `publicCatalog` limiter. It's four independent reads in
parallel, as in `mongo/src/services/home.service.ts`:
```ts
const [banners, categories, recentProducts, promos] = await Promise.all([
    /* latest 6 banners */, /* categories by name */,
    /* 4 newest active products with brand name, images, variants */, /* 4 active promos */,
]);
```
Phase 10 wraps it in the cache with the key versioned on `catalog`, `products`, `promos` and
`banners`. For now, return it directly.

## NestJS you're practising
Method-level vs class-level metadata · multiple paths on one handler · `Promise.all` inside a
service · best-effort cleanup of external resources

## Tests
- `promos.service.spec.ts`: expired, not started and exhausted promos are all rejected by `apply`,
  and `apply` never writes.
- e2e: a non-admin gets 403 on promo writes and banner routes, and 200 on `/promos/active`.
- e2e: `/home` returns the four arrays in the same shape as the Mongo backend.

## Checkpoint
Create a promo in the admin panel → it appears in `/promos/active` → apply it at checkout → pay →
its count dropped by exactly one. Upload two banners → they show on the homepage.

## Pitfalls
- **Timezones:** compare `timestamptz` with `now()` in the database, not a server-local `new Date()`
  string.
- **Applying ≠ spending.** If `apply` decrements, every abandoned checkout burns a promo use.

## Done when
- [ ] All promo, banner and home routes match the Mongo backend
- [ ] Promo use is only ever decremented inside `fulfillPaidOrder`
