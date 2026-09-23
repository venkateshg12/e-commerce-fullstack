# Phase 01 — Core plumbing: envelope, errors, validation

**Goal:** every response from this app has exactly the shape the Mongo backend produces, success
or error, before any feature exists.

**Why now:** the client already parses `{ status, data, meta, errors }`. If the envelope is right
from day one, every later phase is "write the logic". Otherwise every phase is "write the logic and
chase response-shape bugs".

---

## Prerequisites
- Phase 00 done

## Files

**Copy verbatim from `../mongo/src`:**
```
utils/api/apiEnvelope.ts        → src/common/api/api-envelope.ts   (ok, fail, ApiEnvelope)
utils/errors/appError.ts        → src/common/errors/app-error.ts
utils/errors/appAssert.ts       → src/common/errors/app-assert.ts
constants/https.ts, constants/appErrorCode.ts → src/common/constants/
```

**Create**
```
src/common/api/paginated.ts
src/common/interceptors/envelope.interceptor.ts
src/common/filters/all-exceptions.filter.ts
src/common/pipes/zod-validation.pipe.ts
```

## Steps

1. **The envelope interceptor.** Controllers return plain data. The interceptor wraps it:
   ```ts
   export class Paginated<T> {
       constructor(readonly items: T[], readonly meta: { page: number; limit: number; total: number; hasMore: boolean }) {}
   }

   @Injectable()
   export class EnvelopeInterceptor implements NestInterceptor {
       intercept(_ctx: ExecutionContext, next: CallHandler) {
           return next.handle().pipe(
               map((body) => (body instanceof Paginated ? ok(body.items, body.meta) : ok(body))),
           );
       }
   }
   ```
   `Paginated` is how `/products` and `/admin/orders` put `{ page, limit, total, hasMore }` into
   `meta`, the way `paginationQuerySchema` in `@repo/types` expects.

2. **The exception filter.** Port `middleware/errorHandler.ts` case by case, in the same order:
   | Error | Response |
   |---|---|
   | `ZodError` | 400, `{ errors: [{ path, message }] }`, **exactly** today's shape (note: no `status` key) |
   | `MulterError` | 400, `fail(<friendly message>, error.code)` |
   | `Error` starting `"Invalid file type"` | 400, `fail(message, "INVALID_FILE_TYPE")` |
   | `AppError` | `error.statusCode`, `fail(message, errorCode ?? "APP_ERROR")` |
   | `HttpException` (Nest's own: 404, 413…) | its status, `fail(message)` |
   | anything else | 500, `fail("Internal Server Error", "INTERNAL_SERVER_ERROR")`, logged with the stack |

   Keep the refresh-path rule too: if `req.path === "/auth/refresh"`, clear the auth cookies before
   answering.
   ```ts
   @Catch()
   export class AllExceptionsFilter implements ExceptionFilter {
       catch(error: unknown, host: ArgumentsHost) {
           const res = host.switchToHttp().getResponse<Response>();
           const req = host.switchToHttp().getRequest<Request>();
           // … the table above
       }
   }
   ```

3. **The 404.** An unknown route raises Nest's `NotFoundException`, which lands in the filter.
   Compare the body with `mongo/src/middleware/notFound.ts` and match it exactly.

4. **The Zod pipe.** This is the whole of it, which is why you don't need `nestjs-zod`:
   ```ts
   export class ZodValidationPipe<T extends z.ZodType> implements PipeTransform {
       constructor(private readonly schema: T) {}
       transform(value: unknown): z.infer<T> {
           return this.schema.parse(value);    // a ZodError goes to the filter
       }
   }
   // usage
   @Post("/register")
   register(@Body(new ZodValidationPipe(registerSchema)) body: RegisterInput) { … }
   ```
   Import schemas from `@repo/types` wherever they exist, so client and server validate the same way.

5. **Register both globally, through DI**, so they can inject services later:
   ```ts
   providers: [
       { provide: APP_INTERCEPTOR, useClass: EnvelopeInterceptor },
       { provide: APP_FILTER, useClass: AllExceptionsFilter },
   ]
   ```
   Prefer this over `app.useGlobalFilters(new …)` in `main.ts`. Those instances live outside the
   DI container and are skipped by e2e tests that build the app from `AppModule`.

6. **`appAssert` stays.** Services keep calling `appAssert(user, NOT_FOUND, "User not found")`.
   Don't swap it for Nest's `NotFoundException`: `AppError` carries the `appErrorCode` the client
   reads.

## NestJS you're practising
The request lifecycle (middleware → guards → interceptors (before) → pipes → handler →
interceptors (after) → filters) · `APP_INTERCEPTOR` / `APP_FILTER` tokens · RxJS `map` in
interceptors · `ArgumentsHost`

## Tests
- `all-exceptions.filter.spec.ts`: one test per row of the table, including the refresh-path
  cookie clearing.
- `envelope.interceptor.spec.ts`: plain value vs `Paginated`.
- e2e: an unknown route matches Mongo's 404 body byte for byte.

## Checkpoint
Add a temporary `/debug` controller with four routes: one returns data, one throws `AppError`, one
parses a bad body with the pipe, one throws a plain `Error`. Compare each response with the same
case in the Mongo backend. Then delete it.

## Pitfalls
- **`@Res()` without `passthrough: true`** bypasses the interceptor: that route's response comes
  back un-enveloped.
- **Don't wrap twice.** If a handler returns `ok(...)` itself, the client gets
  `{ data: { status, data } }`. Controllers return raw data, always.
- **Streaming or file responses** (none today) would need the interceptor to skip them.

## Done when
- [ ] Success, `AppError`, `ZodError`, Multer, 404 and 500 all match the Mongo backend's shapes
- [ ] The filter and interceptor are registered through `APP_FILTER` / `APP_INTERCEPTOR`
- [ ] Every row of the filter table has a unit test
