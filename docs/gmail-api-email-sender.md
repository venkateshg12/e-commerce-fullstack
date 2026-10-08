# Sending email with the Gmail API (OAuth 2.0 + refresh token)

A reusable recipe for sending transactional email (verification links, password resets, receipts)
from a dedicated Gmail account, with no SMTP password, no per-user Google login, and no third-party
email provider. Extracted from the ShopyMart e-commerce backend (`apps/backends/mongo`), where it is
running and tested.

Stack assumed: **Node + Express + TypeScript + zod + pnpm**. Everything Express-specific lives in the
controller and route; the service is framework-free.

---

## 1. How it works

```
 ONE TIME (you, in a browser)                     EVERY EMAIL (no human involved)
 ─────────────────────────────                    ───────────────────────────────
 GET /api/auth/gmail                              sendEmail({ to, subject, text, html })
   └─► Google consent screen                          │
        └─► you pick the sender account               ▼
             └─► Google redirects to              OAuth2 client + GMAIL_REFRESH_TOKEN
                 /api/auth/gmail/callback             │  (auto-exchanges for a ~1h access token,
                   └─► backend swaps ?code= for       │   cached, renewed when it expires)
                       access + REFRESH token         ▼
                         └─► printed ONCE to        gmail.users.messages.send({ raw })
                             the server console         │
                             → you paste it into        ▼
                             .env as GMAIL_REFRESH_TOKEN   recipient inbox
```

- The **refresh token** is the only long-lived secret. It cannot be invented; it only comes out of the
  browser flow above.
- Your websites' users never see Google. The OAuth flow authorizes **your backend** to send as **your
  sender account**, once.
- Scope requested: **`gmail.send` only**. Never request `gmail.readonly`, `gmail.modify` or
  `https://mail.google.com/` — a send-only app is much easier to get verified.

---

## 2. Google Cloud setup (once per sender account / project)

Use a **separate Google Cloud project** for email. Do not reuse the project that holds your
"Sign in with Google" client — different purpose, different consent screen, different scopes.

1. [console.cloud.google.com](https://console.cloud.google.com) → create a project (e.g. `GV Email Service`).
2. **APIs & Services → Library → Gmail API → Enable.**
3. **Google Auth Platform** (OAuth consent screen):
   - App name, support email, contact email.
   - Audience: **External**. Publishing status: **Testing** while developing.
   - **Test users: add the sender Gmail address** (e.g. `noreply.gvprojects@gmail.com`). Only test users
     can authorize while in Testing.
   - **Data Access → Add scope:** `https://www.googleapis.com/auth/gmail.send`.
4. **Clients → Create client → Web application.**
   - **Authorized redirect URIs** — one per backend, exact match including port and path:
     - `http://localhost:5000/api/auth/gmail/callback`
     - `http://localhost:4000/api/auth/gmail/callback` (another app sharing the same client)
     - later: `https://api.yourdomain.com/api/auth/gmail/callback`
   - Copy the **Client ID** and **Client secret**.
5. One Google project + one OAuth client + one sender account can serve **many backends**. Each backend
   only needs its own redirect URI registered and its own `.env`.

> The redirect URI is compared **character for character**. `localhost` vs `127.0.0.1`, a trailing slash,
> or a different port will give `redirect_uri_mismatch`.

---

## 3. Install

```bash
pnpm add googleapis zod        # zod you probably already have
```

Cost to know about: `googleapis` is ~240 MB installed and adds ~0.45 s to process start. If cold
start matters (free-tier hosting), `@googleapis/gmail` is the same API at a fraction of the size — the
code below changes only its import lines.

---

## 4. Environment variables

`.env.example` (placeholders only — never commit real values; make sure `.env*` is in `.gitignore`):

```bash
# Gmail API sender. One-time setup: start the server, open
# http://localhost:5000/api/auth/gmail as the sender account, then paste the refresh token printed
# in the server console into GMAIL_REFRESH_TOKEN and restart.
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REDIRECT_URI=http://localhost:5000/api/auth/gmail/callback
GMAIL_REFRESH_TOKEN=
# Optional display name shown next to the sender address.
GMAIL_SENDER_NAME=
# Authorization routes are always on outside production; set true only while re-authorizing in production.
GMAIL_OAUTH_SETUP=false
```

`src/constants/env.ts` — all **optional** (default `""`) so the server can boot *before* you have a
refresh token. They fail with a clean error at send time instead of crashing at startup:

```ts
export const GMAIL_CLIENT_ID = getEnv("GMAIL_CLIENT_ID", "");
export const GMAIL_CLIENT_SECRET = getEnv("GMAIL_CLIENT_SECRET", "");
export const GMAIL_REDIRECT_URI = getEnv("GMAIL_REDIRECT_URI", "");
export const GMAIL_REFRESH_TOKEN = getEnv("GMAIL_REFRESH_TOKEN", "");
export const GMAIL_SENDER_NAME = getEnv("GMAIL_SENDER_NAME", "");
export const GMAIL_OAUTH_SETUP = getEnv("GMAIL_OAUTH_SETUP", "false");
```

(`getEnv` is the project's `process.env[key] || default`-or-throw helper. `NODE_ENV` is also read.)

Rules: the secret and refresh token never go in client code, `VITE_*` variables, API responses, logs
or error messages.

---

## 5. Files

```
src/
  config/gmail.ts                       OAuth2 client (created once, lazily)
  services/gmail.service.ts             sendEmail + MIME + error mapping + auth-flow helpers
  controllers/gmailAuth.controller.ts   authorize / callback / test handlers (thin)
  routes/gmail.route.ts                 mounted at /api/auth/gmail
```

Plus three small edits: `constants/env.ts` (above), `constants/appErrorCode.ts`, and the router mount
in `index.ts`.

### 5.1 `src/constants/appErrorCode.ts` — add three codes

```ts
export enum appErrorCode {
    // ...existing codes
    GmailNotConfigured = "GMAIL_NOT_CONFIGURED",
    GmailAuthInvalid = "GMAIL_AUTH_INVALID",
    GmailSendFailed = "GMAIL_SEND_FAILED"
}
```

### 5.2 `src/config/gmail.ts`

```ts
import { Auth, google } from "googleapis";
import { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REDIRECT_URI } from "../constants/env";
import { INTERNAL_SERVER_ERROR } from "../constants/https";
import { appErrorCode } from "../constants/appErrorCode";
import { appAssert } from "../utils/errors";

// The one permission requested: sending. Never widen this to read/modify/full-mailbox scopes.
export const GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.send"];

// The sender identity is fixed by the application, never taken from a caller.
// >>> CHANGE THIS PER PROJECT <<<
export const GMAIL_SENDER_ADDRESS = "noreply.gvprojects@gmail.com";

let oauthClient: Auth.OAuth2Client | undefined;

/*
  The single OAuth2 client for the Gmail project, deliberately separate from the Google sign-in
  client. Created on first use so a server without Gmail configured still boots; it then fails here,
  with a clean error, instead of at import time.
 */
export const getGmailOAuthClient = (): Auth.OAuth2Client => {
    appAssert(
        GMAIL_CLIENT_ID && GMAIL_CLIENT_SECRET && GMAIL_REDIRECT_URI,
        INTERNAL_SERVER_ERROR,
        "Gmail is not configured on the server (GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REDIRECT_URI)",
        appErrorCode.GmailNotConfigured
    );

    oauthClient ??= new google.auth.OAuth2(GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REDIRECT_URI);
    return oauthClient;
};
```

### 5.3 `src/services/gmail.service.ts`

The whole sender. No `req`/`res`, no queue — callable from a controller, a BullMQ processor, or a
standalone email service unchanged.

```ts
import crypto from "node:crypto";
import { Auth, gmail_v1, google } from "googleapis";
import { z } from "zod";
import { GMAIL_REFRESH_TOKEN, GMAIL_SENDER_NAME } from "../constants/env";
import { BAD_GATEWAY, BAD_REQUEST, HttpStatusCode, INTERNAL_SERVER_ERROR, TOO_MANY_REQUESTS } from "../constants/https";
import { appErrorCode } from "../constants/appErrorCode";
import { GMAIL_SCOPES, GMAIL_SENDER_ADDRESS, getGmailOAuthClient } from "../config/gmail";
import { AppError, appAssert } from "../utils/errors";

/*
  Sends mail through the Gmail API as GMAIL_SENDER_ADDRESS, using a long-lived refresh token: the
  OAuth2 client exchanges it for short-lived access tokens by itself, so nobody signs in per email.

  Kept free of req/res and of any queue so it can later be called from a BullMQ processor or moved
  into a standalone email service unchanged.
 */

const hasText = (value?: string) => Boolean(value?.trim());

// Header values must be a single line: a CR/LF here is how header injection happens.
const singleLine = z.string().trim().refine((value) => !/[\r\n]/.test(value), "Must be a single line");

const sendEmailSchema = z
    .object({
        to: z.string().trim().email("Invalid recipient email address"),
        subject: singleLine.pipe(z.string().min(1, "Subject is required").max(300, "Subject is too long")),
        text: z.string().optional(),
        html: z.string().optional(),
    })
    .refine((email) => hasText(email.text) || hasText(email.html), {
        message: "Provide a text body, an html body, or both",
        path: ["text"],
    });

// Deliberately has no `from`: the sender identity belongs to the application, not the caller.
export type SendEmailInput = z.input<typeof sendEmailSchema>;

// ---------------------------------------------------------------------------------------------
// MIME construction
// ---------------------------------------------------------------------------------------------

const CRLF = "\r\n";
const isAscii = (value: string) => /^[\x20-\x7e]*$/.test(value);

// RFC 2047 encoded-words are capped at 75 characters, so long non-ASCII values are split on
// character boundaries (never mid-code-point) into several words.
const encodeHeaderValue = (value: string): string => {
    if (isAscii(value)) return value;

    const MAX_CHUNK_BYTES = 45; // 45 bytes -> 60 base64 chars, plus 12 of "=?UTF-8?B??="
    const words: string[] = [];
    let chunk = "";

    for (const char of value) {
        if (Buffer.byteLength(chunk + char) > MAX_CHUNK_BYTES) {
            words.push(chunk);
            chunk = "";
        }
        chunk += char;
    }
    if (chunk) words.push(chunk);

    return words.map((word) => `=?UTF-8?B?${Buffer.from(word, "utf8").toString("base64")}?=`).join(`${CRLF} `);
};

const formatFromHeader = (): string => {
    // Control characters have no place in a display name, and would break the header.
    const name = GMAIL_SENDER_NAME.replace(/[\u0000-\u001f\u007f]/g, "").trim();
    if (!name) return GMAIL_SENDER_ADDRESS;

    const displayName = isAscii(name) ? `"${name.replace(/(["\\])/g, "\\$1")}"` : encodeHeaderValue(name);
    return `${displayName} <${GMAIL_SENDER_ADDRESS}>`;
};

// Base64 bodies are wrapped at 76 characters, as MIME requires.
const encodeBody = (content: string) =>
    Buffer.from(content, "utf8")
        .toString("base64")
        .replace(/.{1,76}/g, "$&" + CRLF)
        .trimEnd();

const bodyPart = (contentType: "text/plain" | "text/html", content: string) =>
    [`Content-Type: ${contentType}; charset="UTF-8"`, "Content-Transfer-Encoding: base64", "", encodeBody(content)].join(CRLF);

const buildMimeMessage = ({ to, subject, text, html }: z.output<typeof sendEmailSchema>): string => {
    const headers = [
        `From: ${formatFromHeader()}`,
        `To: ${to}`,
        `Subject: ${encodeHeaderValue(subject)}`,
        "MIME-Version: 1.0",
    ];

    const textBody = hasText(text) ? text! : undefined;
    const htmlBody = hasText(html) ? html! : undefined;

    // Only one body: a plain single-part message.
    if (!textBody || !htmlBody) {
        const [contentType, content] = htmlBody ? (["text/html", htmlBody] as const) : (["text/plain", textBody!] as const);
        return [...headers, bodyPart(contentType, content)].join(CRLF);
    }

    // Both: multipart/alternative, plain text first so clients prefer the last (html) part.
    const boundary = `alt_${crypto.randomBytes(16).toString("hex")}`;
    return [
        ...headers,
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
        "",
        `--${boundary}`,
        bodyPart("text/plain", textBody),
        `--${boundary}`,
        bodyPart("text/html", htmlBody),
        `--${boundary}--`,
        "",
    ].join(CRLF);
};

// ---------------------------------------------------------------------------------------------
// Google error mapping
// ---------------------------------------------------------------------------------------------

type GoogleErrorShape = {
    code?: string | number;
    response?: { status?: number; data?: { error?: unknown } };
};

/*
  Reduces a googleapis failure to an AppError. The raw error is never logged or returned: a Gaxios
  error carries the request config, including the Authorization header and the client secret.
 */
const toAppError = (error: unknown): AppError => {
    if (error instanceof AppError) return error;

    const { code, response } = (error ?? {}) as GoogleErrorShape;
    const status = response?.status;
    const body = response?.data?.error;

    // The token endpoint answers with a string ("invalid_grant"); the Gmail API with an object.
    const oauthError = typeof body === "string" ? body : undefined;
    const apiReason =
        typeof body === "object" && body !== null
            ? ((body as { errors?: { reason?: string }[] }).errors?.[0]?.reason ?? (body as { status?: string }).status)
            : undefined;

    console.error("[gmail] Failed to send email", { status, code, oauthError, apiReason });

    const fail = (httpStatus: HttpStatusCode, message: string, errorCode: appErrorCode) =>
        new AppError(httpStatus, message, errorCode);

    if (oauthError === "invalid_grant" || oauthError === "invalid_client" || oauthError === "unauthorized_client" || status === 401) {
        return fail(
            INTERNAL_SERVER_ERROR,
            "Gmail authorization is invalid or has expired; re-run the Gmail authorization and update GMAIL_REFRESH_TOKEN",
            appErrorCode.GmailAuthInvalid
        );
    }
    if (status === 429 || (status === 403 && /ratelimit|dailylimit|quota/i.test(apiReason ?? ""))) {
        return fail(TOO_MANY_REQUESTS, "Gmail sending limit reached; try again later", appErrorCode.GmailSendFailed);
    }
    if (status === 400) {
        return fail(BAD_REQUEST, "Gmail rejected the message; check the recipient and content", appErrorCode.GmailSendFailed);
    }
    if (status === 403) {
        return fail(
            BAD_GATEWAY,
            "Gmail denied the request; check the Gmail API is enabled and the gmail.send scope was granted",
            appErrorCode.GmailSendFailed
        );
    }
    return fail(BAD_GATEWAY, "Failed to send email through Gmail", appErrorCode.GmailSendFailed);
};

// ---------------------------------------------------------------------------------------------
// Sending
// ---------------------------------------------------------------------------------------------

let gmailClient: gmail_v1.Gmail | undefined;

const getGmailClient = (): gmail_v1.Gmail => {
    appAssert(
        GMAIL_REFRESH_TOKEN,
        INTERNAL_SERVER_ERROR,
        "Gmail is not authorized yet (GMAIL_REFRESH_TOKEN is not set); complete the one-time Gmail authorization",
        appErrorCode.GmailNotConfigured
    );

    if (!gmailClient) {
        const auth = getGmailOAuthClient();
        // Only the refresh token is stored; the client fetches and renews access tokens itself.
        auth.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN });
        gmailClient = google.gmail({ version: "v1", auth });
    }
    return gmailClient;
};

export const sendEmail = async (input: SendEmailInput): Promise<{ messageId: string }> => {
    const email = sendEmailSchema.parse(input);
    const gmail = getGmailClient();

    let raw: string;
    try {
        raw = Buffer.from(buildMimeMessage(email), "utf8").toString("base64url");
    } catch {
        throw new AppError(INTERNAL_SERVER_ERROR, "Failed to build the email message", appErrorCode.GmailSendFailed);
    }

    try {
        const { data } = await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
        console.log("[gmail] Email sent successfully", { messageId: data.id });
        return { messageId: data.id ?? "" };
    } catch (error) {
        throw toAppError(error);
    }
};

// ---------------------------------------------------------------------------------------------
// One-time authorization (the browser flow that produces GMAIL_REFRESH_TOKEN)
// ---------------------------------------------------------------------------------------------

export const getGmailAuthUrl = (state: string): string =>
    getGmailOAuthClient().generateAuthUrl({
        access_type: "offline", // ask for a refresh token
        prompt: "consent", // and make Google issue one even if this account authorized before
        scope: GMAIL_SCOPES,
        state,
        // Pre-selects the sender account so a personal account isn't picked by accident.
        login_hint: GMAIL_SENDER_ADDRESS,
    });

export const exchangeGmailAuthCode = async (code: string): Promise<string> => {
    let tokens: Auth.Credentials;
    try {
        ({ tokens } = await getGmailOAuthClient().getToken(code));
    } catch (error) {
        // Never log the error object itself: it can carry the code and client secret.
        const status = (error as GoogleErrorShape)?.response?.status;
        console.error("[gmail] Authorization code exchange failed", { status });
        throw new AppError(BAD_REQUEST, "Invalid or expired authorization code; start again at /api/auth/gmail", appErrorCode.GmailAuthInvalid);
    }

    appAssert(
        tokens.scope?.split(" ").includes(GMAIL_SCOPES[0]),
        BAD_REQUEST,
        "The gmail.send permission was not granted",
        appErrorCode.GmailAuthInvalid
    );
    appAssert(
        tokens.refresh_token,
        BAD_GATEWAY,
        "Google did not return a refresh token; remove this app at myaccount.google.com/permissions for the sender account and try again",
        appErrorCode.GmailAuthInvalid
    );

    return tokens.refresh_token;
};
```

### 5.4 `src/controllers/gmailAuth.controller.ts`

```ts
import crypto from "node:crypto";
import { CookieOptions } from "express";
import { NODE_ENV } from "../constants/env";
import { BAD_REQUEST, OK } from "../constants/https";
import { exchangeGmailAuthCode, getGmailAuthUrl, sendEmail } from "../services/gmail.service";
import { ok } from "../utils/api";
import { appAssert, catchError } from "../utils/errors";

const STATE_COOKIE = "gmail_oauth_state";

// Scoped to this flow's path. Lax is enough: Google returns the browser with a top-level GET.
const stateCookieOptions: CookieOptions = {
    httpOnly: true,
    sameSite: "lax",
    secure: NODE_ENV !== "development",
    path: "/api/auth/gmail",
};

const sameValue = (a: string, b: string) =>
    crypto.timingSafeEqual(crypto.createHash("sha256").update(a).digest(), crypto.createHash("sha256").update(b).digest());

// GET /api/auth/gmail — send the browser to Google's consent screen.
export const gmailAuthorizeHandler = catchError(async (_req, res) => {
    // A random state tied to this browser stops someone else's authorization from being replayed here.
    const state = crypto.randomBytes(32).toString("hex");
    res.cookie(STATE_COOKIE, state, { ...stateCookieOptions, maxAge: 10 * 60 * 1000 });

    console.log("[gmail] OAuth authorization started");
    res.redirect(getGmailAuthUrl(state));
});

// GET /api/auth/gmail/callback — Google sends the browser back here with a one-time code.
export const gmailCallbackHandler = catchError(async (req, res) => {
    const { code, state, error } = req.query;
    const expectedState = req.cookies?.[STATE_COOKIE];
    res.clearCookie(STATE_COOKIE, stateCookieOptions);

    appAssert(!error, BAD_REQUEST, "Google authorization was denied or failed; start again at /api/auth/gmail");
    appAssert(
        typeof state === "string" && typeof expectedState === "string" && sameValue(state, expectedState),
        BAD_REQUEST,
        "Invalid or expired authorization session; start again at /api/auth/gmail"
    );
    appAssert(typeof code === "string" && code.length > 0, BAD_REQUEST, "Missing authorization code");

    const refreshToken = await exchangeGmailAuthCode(code);

    /*
      The one place the refresh token is shown: the server console, for the person running the setup.
      It is never put in the response, and nothing else in the app logs it.
     */
    console.log("[gmail] Authorization successful. Add this to your .env, then restart the server:");
    console.log(`GMAIL_REFRESH_TOKEN=${refreshToken}`);

    res.status(OK).type("html").send(
        "<p>Gmail authorization successful. You can now configure GMAIL_REFRESH_TOKEN (see the server console).</p>"
    );
});

// POST /api/auth/gmail/test — admin-only, development-only smoke test of sendEmail.
export const gmailTestHandler = catchError(async (req, res) => {
    const { messageId } = await sendEmail(req.body);
    res.status(OK).json(ok({ messageId }));
});
```

Needs `cookie-parser` mounted before the router (for `req.cookies`).

### 5.5 `src/routes/gmail.route.ts`

```ts
import { Router } from "express";
import { gmailAuthorizeHandler, gmailCallbackHandler, gmailTestHandler } from "../controllers/gmailAuth.controller";
import authenticate from "../middleware/authenticate";
import requireAdmin from "../middleware/requireAdmin";
import { protectedApiLimiter } from "../config/rateLimiter";
import { GMAIL_OAUTH_SETUP, NODE_ENV } from "../constants/env";

export const gmailRoutes = Router();

// prefix : /api/auth/gmail

/*
  The one-time authorization flow. Anyone who can open it can park a Gmail refresh token in the
  server log, so in production it is off unless GMAIL_OAUTH_SETUP=true (set it only while
  re-authorizing, e.g. when a Google "Testing" token expires after 7 days).
 */
if (NODE_ENV !== "production" || GMAIL_OAUTH_SETUP === "true") {
    gmailRoutes.get("/", gmailAuthorizeHandler);
    gmailRoutes.get("/callback", gmailCallbackHandler);
}

// An endpoint that sends mail to any address is never mounted in production.
if (NODE_ENV !== "production") {
    gmailRoutes.post("/test", authenticate, requireAdmin, protectedApiLimiter, gmailTestHandler);
}
```

### 5.6 Mount it in `src/index.ts`

```ts
import { gmailRoutes } from "./routes/gmail.route";

// after cookieParser() and express.json(), before notFound / errorHandler:
// The path is fixed by the redirect URI registered with Google (/api/auth/gmail/callback).
app.use("/api/auth/gmail", gmailRoutes);
```

---

## 6. Project helpers the code relies on

If the new project doesn't have these, here are the minimal versions. The names match what the code imports.

```ts
// utils/errors/appError.ts
export class AppError extends Error {
    constructor(public readonly statusCode: number, message: string, public readonly errorCode?: string) {
        super(message);
        this.name = "AppError";
    }
}

// utils/errors/appAssert.ts
import assert from "node:assert";
export default function appAssert(condition: any, status: number, message: string, code?: string): asserts condition {
    assert(condition, new AppError(status, message, code));
}

// utils/errors/catchError.ts — forwards async errors to the error middleware
export const catchError = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
    (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

// constants/https.ts
export const OK = 200, BAD_REQUEST = 400, TOO_MANY_REQUESTS = 429, INTERNAL_SERVER_ERROR = 500, BAD_GATEWAY = 502;
export type HttpStatusCode = number;
```

Also used: `ok(data)` (response envelope `{ status: "success", data }`), `authenticate` + `requireAdmin`
(only for the dev test route), `protectedApiLimiter` (rate limiter). Swap in your own equivalents.

Your error middleware must turn `AppError` into `res.status(err.statusCode).json({ message, code })` and
`ZodError` into a 400 — the service throws both.

---

## 7. One-time authorization (getting `GMAIL_REFRESH_TOKEN`)

1. Fill `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REDIRECT_URI` in `.env`. Leave the refresh token empty.
2. Start the backend (`pnpm dev`).
3. Open **`http://localhost:<PORT>/api/auth/gmail`** in a browser.
4. Choose the **sender account** (e.g. `noreply.gvprojects@gmail.com`). Do not pick a personal account.
5. On "Google hasn't verified this app" (normal in Testing) → **Continue**, then allow sending email.
6. The browser lands on `/api/auth/gmail/callback` and shows a success message.
7. The **server console** prints `GMAIL_REFRESH_TOKEN=...`. Copy that line into `.env`.
8. Restart the server. Done — no further logins, ever (until the token is revoked or expires, see §10).

Add the token as a secret on the host (Render/Railway/etc. dashboard), not in the repo.

---

## 8. Using it

From any service:

```ts
import { sendEmail } from "../services/gmail.service";

await sendEmail({
    to: user.email,
    subject: "Verify your email",
    text: `Verify your email: ${link}`,                 // plain-text fallback
    html: `<p>Verify your email: <a href="${link}">click here</a></p>`,
});
```

- `to`, `subject`, and at least one of `text`/`html` are required. Both → `multipart/alternative`.
- There is intentionally **no `from`**: the sender is the fixed `GMAIL_SENDER_ADDRESS`. Gmail would
  override a different address anyway, and callers must not choose the sender.
- It throws `ZodError` (bad input → 400) or `AppError` (Google/config problems).

**Inside a BullMQ processor** (retry on failure — let the error propagate):

```ts
export async function processVerifyEmail(job: Job<VerifyEmailPayload>) {
    const tpl = getVerificationEmail(job.data.verificationToken);
    await sendEmail({ to: job.data.email, ...tpl });   // throws → BullMQ retries with backoff
}
```

Note: an `AppError` for a bad recipient will keep failing; wrap it in `UnrecoverableError` if you don't
want pointless retries.

### Smoke test (dev only)

```bash
curl -c jar -X POST http://localhost:5000/auth/login -H 'content-type: application/json' \
  -d '{"email":"<admin email>","password":"<password>"}'

curl -b jar -X POST http://localhost:5000/api/auth/gmail/test -H 'content-type: application/json' \
  -d '{"to":"you@example.com","subject":"Gmail API Test","text":"Hi","html":"<h1>Hi</h1>"}'
# → {"status":"success","data":{"messageId":"..."}}
```

Or without HTTP, a scratch script:

```ts
import "dotenv/config";
import { sendEmail } from "./src/services/gmail.service";
sendEmail({ to: "you@example.com", subject: "Test", text: "Hello" }).then(console.log);
```

---

## 9. Testing without real credentials

What was verified for this implementation, and how:

- **Auth URL**: contains `access_type=offline`, `prompt=consent`, only the `gmail.send` scope, `login_hint`, the redirect URI.
- **MIME**: write the decoded `raw` to a `.eml` and parse it with Python's strict parser —
  `email.message_from_bytes(raw, policy=email.policy.strict)` → `m.defects == []`.
- **Google stubbed**: gaxios 7 (inside `googleapis`) uses `node-fetch`, **not** the global `fetch`, so
  stubbing `globalThis.fetch` does nothing. Inject at the client instead:
  `getGmailOAuthClient().transporter.defaults.fetchImplementation = myStub`.
  Stub `https://oauth2.googleapis.com/token` and `…/gmail/v1/users/me/messages/send`.
- **Callback**: valid state, wrong state, missing cookie, missing code, bad code, `error=access_denied`,
  wrong scope, no refresh token → each gives a clean 4xx/5xx.
- **Secrets**: grep the captured logs for the client secret, refresh token and `code=` — none present.
- **Production gating**: with `NODE_ENV=production`, `/api/auth/gmail` and `/test` return 404.

---

## 10. Problems you will meet (and what they mean)

| Symptom | Cause | Fix |
|---|---|---|
| `redirect_uri_mismatch` | Redirect URI in `.env` ≠ one registered in Google Cloud, char for char | Fix `.env` or add the URI to the OAuth client |
| `Error 403: access_denied` / "app not verified, only test users" | Sender account isn't a **Test user** | Google Auth Platform → Audience → Test users → add it |
| `GMAIL_AUTH_INVALID` / `invalid_grant` on send | Refresh token revoked, or **expired (Testing mode = 7 days)**, or you changed the client secret | Re-run §7 (set `GMAIL_OAUTH_SETUP=true` in production for the moment) |
| "Google did not return a refresh token" | Account authorized before and Google didn't re-issue | Remove the app at `myaccount.google.com/permissions` for the sender account, repeat §7 (`prompt=consent` already requests it) |
| `GMAIL_NOT_CONFIGURED` | Missing `GMAIL_*` env var | Set it and restart |
| 403 "Gmail API has not been used in project…" | API not enabled | Enable Gmail API in the same project as the client |
| 429 / `rateLimitExceeded` | Daily sending cap (~500 recipients/day on free Gmail, ~2000 on Workspace) | Slow down, or move to a real email provider |
| Mail arrives but in spam / Promotions | Reputation, see §12 | Check headers, improve content |

Things that look like they should work but don't:

- `gmail.users.getProfile` **needs a broader scope** than `gmail.send`, so you cannot programmatically
  verify *which* account got authorized. Use `login_hint` and look at the consent screen instead.
- Gmail ignores a spoofed `From` and forces the authenticated account's address (the display name is kept).

---

## 11. Going to production

- **Testing → In production.** While the consent screen is in *Testing*, refresh tokens die after **7 days**. Publish the app (Google Auth Platform → Audience → **Publish app**).
- `gmail.send` is a **sensitive scope**, so Google asks for **verification**: a domain you own, a
  privacy-policy page, a scope justification, often a short demo video. Until verified, users see an
  "unverified app" screen — acceptable here because the only "user" is you. Do not widen scopes to dodge verification.
- Add the production callback (`https://api.yourdomain.com/api/auth/gmail/callback`) to the OAuth client; **keep the localhost ones**.
- Set the four `GMAIL_*` values as host secrets. Keep `GMAIL_OAUTH_SETUP=false`; flip it only to re-authorize.
- Remember the test endpoint is not mounted in production by design.
- Add a fallback or an alert for `GMAIL_AUTH_INVALID` — when it fires, no email goes out at all.

---

## 12. Deliverability (inbox vs spam)

- Mail sent via the API from a real `@gmail.com` account is signed by Google (SPF/DKIM/DMARC pass), so
  it authenticates correctly. Verify: open a received mail → ⋮ → **Show original** → `SPF: PASS`, `DKIM: PASS`, `DMARC: PASS`.
- A brand-new sender with no history, or a generic "test" message, can still land in **spam or the Promotions tab**. Real transactional mail with a link, sent to people who just signed up, does better.
- Always send a **text part and an html part** (done by passing both).
- In your "email sent" UI, tell users to **check their spam folder too**.
- Gmail limits: ~500 recipients/day (free). You cannot brand the domain or set your own DKIM. For volume or
  brand control, use your own domain with Resend / SES / Postmark and set SPF, DKIM, DMARC there.

---

## 13. Porting checklist (new project)

- [ ] New (or existing) Google Cloud **email** project; Gmail API enabled; sender added as test user; `gmail.send` scope added
- [ ] Redirect URI for this app registered (`…/api/auth/gmail/callback`)
- [ ] `pnpm add googleapis zod`
- [ ] Copy `config/gmail.ts`, `services/gmail.service.ts`, `controllers/gmailAuth.controller.ts`, `routes/gmail.route.ts`
- [ ] Change `GMAIL_SENDER_ADDRESS` in `config/gmail.ts`
- [ ] Add the `GMAIL_*` vars to `env.ts` and `.env.example`; confirm `.env*` is gitignored
- [ ] Add the three `appErrorCode` entries
- [ ] Ensure `cookie-parser`, error middleware (handles `AppError` + `ZodError`), and helpers from §6 exist
- [ ] Mount `app.use("/api/auth/gmail", gmailRoutes)` after `cookieParser()`/`express.json()`
- [ ] `tsc --noEmit`
- [ ] Run §7, paste `GMAIL_REFRESH_TOKEN`, restart, send the §8 smoke test
- [ ] Replace the old mail sender (SMTP/Resend) with `sendEmail` where emails are triggered
- [ ] Before launch: publish the Google app (§11) and add the production redirect URI + host secrets

## 14. Extracting into a shared service later

`gmail.service.ts` and `config/gmail.ts` have no dependency on Express, Mongo or your domain models, so
you can lift them into a package (`@repo/email`) or a small standalone service that other backends call
over HTTP or a queue. Keep the OAuth routes in whichever process owns the redirect URI; the sending code
only needs the four `GMAIL_*` values.
