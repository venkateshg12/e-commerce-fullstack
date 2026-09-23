# Phase 06 — Jobs and uploads

**Goal:** emails and product-image processing run as BullMQ jobs through `@nestjs/bullmq`, file
uploads work for product images, avatars and banners, and Bull Board shows the queues in
development.

**Why now:** auth has been logging email links since phase 3, and the admin panel can't add
product images yet.

---

## Prerequisites
- Phase 05 done
- Redis on 6379 (`noeviction`: the queue Redis, never the cache one)
- Cloudinary, Resend/SMTP credentials added to the env schema

## Files

**Copy verbatim:** `mongo/src/utils/{cloudinary,imageProcessor}.ts`, `utils/email/*`,
`constants/queue.ts`, `jobs/interfaces/jobPayload.ts`.

**Create**
```
src/infra/queue/queue.module.ts         BullModule.forRootAsync + registerQueue("email", "image")
src/infra/mail/mail.service.ts          enqueue only
src/infra/storage/storage.service.ts    Cloudinary upload/delete
src/modules/jobs/email.processor.ts
src/modules/jobs/image.processor.ts
src/modules/jobs/jobs.module.ts
src/common/upload/upload.options.ts     multer limits + fileFilter, copied from mongo/src/middleware/upload.ts
```

## Steps

1. **Connection:**
   ```ts
   BullModule.forRootAsync({
       inject: [ConfigService],
       useFactory: (config: ConfigService<Env, true>) => ({
           connection: { host: config.get("REDIS_HOST", { infer: true }), port: config.get("REDIS_PORT", { infer: true }),
                         maxRetriesPerRequest: null },   // BullMQ workers require this
       }),
   }),
   BullModule.registerQueue({ name: "email" }, { name: "image" }),
   ```

2. **Producers are services.** `MailService` replaces `jobs/producers/email.producer.ts`:
   ```ts
   @Injectable()
   export class MailService {
       constructor(@InjectQueue("email") private readonly queue: Queue<EmailJobPayload>) {}
       sendVerification(to: string, link: string) {
           return this.queue.add("verification", { to, link }, { attempts: 5, backoff: { type: "exponential", delay: 5_000 } });
       }
   }
   ```
   Phase 3's call sites don't change. The logging stub becomes a real enqueue.

3. **Processors replace workers + processors:**
   ```ts
   @Processor("image", { concurrency: 2 })
   export class ImageProcessor extends WorkerHost {
       constructor(@Inject(DB) private readonly db: Db, private readonly storage: StorageService) { super(); }
       async process(job: Job<ImageJobPayload>) { /* resize with sharp → Cloudinary → rows in product_images */ }
   }
   ```
   Copy the retry, backoff and `removeOnComplete` settings from `mongo/src/jobs/queues/*`.
   Processors get injection like any other provider.

4. **The image job's database write** replaces the two `ProductModel` writes with Prisma 8 calls,
   then calls `invalidateProductDetails([id])`. That's a no-op until phase 10, but put the call in
   now so it isn't forgotten.

5. **Uploads:**
   ```ts
   @Post(":id/images")
   @UseInterceptors(FilesInterceptor("images", 10, productImageUploadOptions))
   upload(@Param("id", ParseUUIDPipe) id: string, @UploadedFiles() files: Express.Multer.File[]) {
       return this.products.addImages(id, files);    // uploads the originals, enqueues the processing
   }
   ```
   Keep the Mongo limits (10MB, image types only). The phase-1 filter already turns `MulterError`
   and "Invalid file type" into friendly 400s. Use `FileInterceptor("avatar")` for `/auth/me/avatar`,
   and `FilesInterceptor("images", 10)` for banners (phase 9).

6. **The remaining image routes:** delete images, set cover, set image colour.

7. **Bull Board, development only.** Mount it as it's mounted today, behind the same basic auth
   (`QUEUE_DASHBOARD_USER` / `PASSWORD`), only when `NODE_ENV !== "production"`. The simplest way
   is in `main.ts` with `@bull-board/express`, getting the queues with
   `app.get(getQueueToken("email"))`. `@bull-board/nestjs` also exists: check its peer range
   supports Nest 12 before you use it.

8. **Where do workers run?** Same process by default (as `import "./worker"` does in Mongo). For a
   standalone worker, add `src/worker.ts` that builds the app with
   `NestFactory.createApplicationContext(WorkerModule)`. That's the same DI container with no HTTP
   server. It's the Nest version of `pnpm worker`.

## NestJS you're practising
Dynamic modules (`forRootAsync`, `registerQueue`) · `@InjectQueue` · `WorkerHost` processors ·
`createApplicationContext` (Nest without HTTP) · interceptors from `@nestjs/platform-express`

## Tests
- `mail.service.spec.ts`: overriding the queue token with a fake shows the job name, payload and
  retry options.
- `image.processor.spec.ts`: fake storage + fake db; failure in Cloudinary → the job throws (so
  BullMQ retries) and no rows are written.
- e2e: upload a 20MB file → 400 with the Mongo message. Upload a `.txt` → 400 `INVALID_FILE_TYPE`.

## Checkpoint
Register → the verification email arrives. Upload product images in the admin panel → watch the
job in Bull Board (`localhost:5002/admin/queues`) → rows appear in `product_images` → the images
show on the storefront.

## Pitfalls
- **`maxRetriesPerRequest: null`** is required for BullMQ connections. Without it, workers crash on
  Redis blips.
- **Sending mail inside a request** (or inside a DB transaction) again. Everything goes through the
  queue.
- **Processor exceptions swallowed:** if `process()` catches and returns, BullMQ marks the job
  completed and never retries.

## Done when
- [ ] Every email the Mongo backend sends is enqueued and delivered
- [ ] All product-image routes, avatar upload and the image job work end to end
- [ ] Bull Board is reachable in development and absent in production
- [ ] A standalone worker process can run the same processors
