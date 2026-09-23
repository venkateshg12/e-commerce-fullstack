# Phase 05 — Background jobs

**Goal:** product images process in the background and emails send, exactly as they do now.

**Why now:** phase 04 built products; without this, image upload does nothing.

---

## Prerequisites
- Phase 03 (Redis on 6379)
- Cloudinary and Resend credentials

## Files — near-verbatim copies

```
jobs/queues/{email,image}.queue.ts
jobs/producers/{email,image}.producer.ts
jobs/processors/{email,image}.processor.ts   ← the only edits are here
jobs/workers/{email,image}.worker.ts
jobs/redis/connection.ts
jobs/interfaces/jobPayload.ts
jobs/dashboard/bull-board.ts   (optional; index.ts mounts Bull Board itself)
utils/cloudinary.ts, utils/imageProcessor.ts, utils/email/*
middleware/upload.ts
worker.ts
```

**The only rewrites:** inside `image.processor.ts`, the two `ProductModel` writes and the
`BannerModel.insertMany` become Prisma calls. Everything else is queue plumbing that doesn't know
what database you use.

## Steps
1. Copy the files and add the env vars (`CLOUDINARY_*`, `RESEND_API_KEY`, `EMAIL_FROM`).
2. In the image processor, replace the Mongo writes:
   - mark `uploadStatus = PROCESSING` → `prisma.product.update`
   - append images → `prisma.productImage.createMany`
   - "exactly one cover" → after insert, set `isCover` on the first image **only if the product has
     none** (a conditional `updateMany`, same as the Mongo guard)
3. Keep `import "./worker"` in `index.ts` so one process serves and processes, with `pnpm worker`
   still able to run standalone.
4. Keep the retry/cleanup semantics: failures retry with backoff, a run's partial Cloudinary
   uploads are destroyed before rethrowing.

## Checkpoint
- Upload three product images in the admin panel → 202 immediately.
- Bull Board (`/admin/queues`, enabled via env) shows the job moving through.
- `SELECT url, is_cover FROM product_images WHERE product_id = '<id>' ORDER BY position;`
  → three rows, exactly one `is_cover = true`.
- Stop the worker, upload again, restart it → the job still runs (it was durable in Redis).

## Pitfalls
- **Connection pool:** the worker shares the Prisma pool with the API. If jobs run at high
  concurrency, raise `connection_limit` in `DATABASE_URL` or run the worker as its own process.
- **Bull Board leaks tokens.** Job payloads contain verification and reset tokens — keep it behind
  the same opt-in + basic auth as the Mongo backend.

## Done when
- [ ] Verification emails arrive via the queue
- [ ] Product images upload, process and appear with exactly one cover
- [ ] Jobs survive a worker restart
