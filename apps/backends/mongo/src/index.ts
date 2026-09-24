import "dotenv/config";
import express from "express";
import {
    CORS_ORIGIN,
    ENABLE_QUEUE_DASHBOARD,
    NODE_ENV,
    PORT,
    QUEUE_DASHBOARD_PASSWORD,
    QUEUE_DASHBOARD_USER,
    RAZORPAY_WEBHOOK_SECRET,
    TRUSTED_PROXY_CIDRS,
} from "./constants/env";
import helmet from "helmet";
import mongoose from "mongoose";
import crypto from "crypto";
import cors from 'cors';
import morgan from "morgan";
import { ok } from "./utils/api";
import { notFound } from "./middleware/notFound";
import { errorHandler } from "./middleware/errorHandler";
import { connectDB } from "./config/db";
import { authRoutes } from "./routes/auth.route";
import cookieParser from "cookie-parser";
import { visitorIdMiddleware } from "./middleware/visitorId";
import { globalLimiter } from "./config/rateLimiter";
import { trustProxy } from "./utils/rateLimiter/ipExtractor";
import { cache } from "./utils/cache";
import sessionRoutes from "./routes/session.route";
import productRoutes from "./routes/product.route";
import catalogRoutes from "./routes/catalog.route";
import { addressRouter } from "./routes/address.route";
import { promoRouter } from "./routes/promo.route";

// Bull Board imports
import { ExpressAdapter } from "@bull-board/express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { emailQueue } from "./jobs/queues/email.queue";
import { imageQueue } from "./jobs/queues/image.queue";
import { cartRouter } from "./routes/cart.route";
import { wishlistRouter } from "./routes/wishlist.route";
import { checkoutRouter } from "./routes/checkout.route";
import { orderRouter } from "./routes/order.route";
import { settingRouter } from "./routes/setting.route";
import { dashboardRouter } from "./routes/dashboard.route";
import { homeRouter } from "./routes/home.route";
import { webhookRouter } from "./routes/webhook.route";
import { closeWorkers } from "./worker";




/**
 * Basic auth for the queue dashboard. Compared with a timing-safe digest comparison so the
 * credentials can't be recovered a character at a time.
 */
const queueDashboardAuth: express.RequestHandler = (req, res, next) => {
    const header = req.headers.authorization ?? "";
    const [scheme, encoded] = header.split(" ");

    if (scheme === "Basic" && encoded) {
        const [user, password] = Buffer.from(encoded, "base64").toString().split(":");
        if (matchesSecret(user, QUEUE_DASHBOARD_USER) && matchesSecret(password, QUEUE_DASHBOARD_PASSWORD)) {
            return next();
        }
    }

    res.setHeader("WWW-Authenticate", 'Basic realm="Queues"');
    res.status(401).send("Authentication required");
};

// Hashing first keeps the comparison length-independent, since timingSafeEqual throws on a
// length mismatch — which would itself leak the length.
const matchesSecret = (candidate: string | undefined, expected: string): boolean => {
    const a = crypto.createHash("sha256").update(candidate ?? "").digest();
    const b = crypto.createHash("sha256").update(expected).digest();
    return crypto.timingSafeEqual(a, b);
};

async function main() {
    await connectDB();
    const app = express();

    /*
      BullMQ dashboard.

      Job payloads contain password-reset and email-verification tokens, so an unauthenticated
      dashboard is an account-takeover path — it used to mount on any NODE_ENV other than
      "production", which meant a staging deploy exposed it to the internet. It now requires an
      explicit opt-in AND credentials, and refuses to mount half-configured.
     */
    const queueDashboardEnabled = ENABLE_QUEUE_DASHBOARD === "true";
    const queueDashboardConfigured =
        Boolean(QUEUE_DASHBOARD_USER) && Boolean(QUEUE_DASHBOARD_PASSWORD);

    if (queueDashboardEnabled && !queueDashboardConfigured) {
        throw new Error(
            "ENABLE_QUEUE_DASHBOARD is true but QUEUE_DASHBOARD_USER/QUEUE_DASHBOARD_PASSWORD are not set"
        );
    }

    if (queueDashboardEnabled && queueDashboardConfigured) {
        const serverAdapter = new ExpressAdapter();
        serverAdapter.setBasePath("/admin/queues");

        createBullBoard({
            queues: [
                new BullMQAdapter(emailQueue),
                new BullMQAdapter(imageQueue),
            ],
            serverAdapter: serverAdapter,
        });

        app.use("/admin/queues", queueDashboardAuth, serverAdapter.getRouter());
    }

    /*
      Trust exactly the proxies the rate limiter trusts. The old `1` believed one hop of
      X-Forwarded-For from any peer, which disagreed with the limiter's own view of the client IP.
     */
    app.set("trust proxy", trustProxy);

    if (NODE_ENV === "production" && !TRUSTED_PROXY_CIDRS.trim()) {
        console.warn(
            "TRUSTED_PROXY_CIDRS is empty. If this server runs behind a load balancer or reverse proxy, " +
            "every client will share that proxy's IP and one rate-limit bucket. See .env.example."
        );
    }

    // Baseline response headers: HSTS, nosniff, frame-ancestors, a conservative referrer policy.
    // `crossOriginResourcePolicy` is relaxed because the storefront is served from another origin.
    app.use(
        helmet({
            crossOriginResourcePolicy: { policy: "cross-origin" },
            hsts: NODE_ENV === "production" ? undefined : false,
        })
    );

    const corsOrigin = (CORS_ORIGIN).split(",").map(origin => origin.trim()).filter(Boolean);

    app.use(cors({ origin: corsOrigin, credentials: true }));

    /*
      The Razorpay webhook goes first, before `express.json()` and before the rate limiter: its
      signature covers the exact bytes Razorpay sent (so the route parses them itself with
      `express.raw`), and a gateway callback must never be throttled as if it were a browser.
     */
    if (RAZORPAY_WEBHOOK_SECRET) {
        app.use("/", webhookRouter);
    } else if (NODE_ENV === "production") {
        throw new Error(
            "RAZORPAY_WEBHOOK_SECRET is not set. Without the webhook, a payment whose customer " +
            "closed the tab is captured at Razorpay but never becomes an order."
        );
    } else {
        console.warn("[webhook] RAZORPAY_WEBHOOK_SECRET not set — /webhooks/razorpay is not mounted.");
    }

    app.use(express.json());
    // `dev` is colourised and human-shaped; a deployed server's output is read by a log collector.
    app.use(morgan(NODE_ENV === "production" ? "combined" : "dev"));
    app.use(cookieParser());
    app.use(visitorIdMiddleware);
    app.use(globalLimiter);


    /*
      Health check first. Several routers are mounted at "/" and call `router.use(authenticate)`,
      which runs for every request that reaches them regardless of path — so a route declared
      after them answers 401 instead of its own response, as /health did.
     */
    /*
      Reports the dependencies, not just the process. Answering 200 while MongoDB was unreachable
      kept a load balancer sending traffic to an instance that could not serve a single request.
      Redis is reported but not fatal: the cache and rate limiter both degrade to working without it.
     */
    app.get("/health", async (_req, res) => {
        const mongoConnected = mongoose.connection.readyState === 1;
        const redisReady = await cache.ping();

        return res.status(mongoConnected ? 200 : 503).json(
            ok({
                status: mongoConnected ? "ok" : "degraded",
                mongo: mongoConnected ? "up" : "down",
                redis: redisReady ? "up" : "down",
            })
        );
    });

    // Routes declaration.
    app.use("/auth", authRoutes);
    app.use("/session", sessionRoutes);
    app.use("/", homeRouter);
    app.use("/", productRoutes);
    app.use("/", catalogRoutes);
    app.use("/", addressRouter);
    app.use("/", promoRouter);
    app.use("/", cartRouter);
    app.use("/", wishlistRouter);
    app.use("/", checkoutRouter);
    app.use("/", orderRouter);
    app.use("/", settingRouter);
    app.use("/", dashboardRouter);

    // Registered before listening, so a request can never arrive at a server whose 404 and error
    // handlers aren't mounted yet.
    app.use(notFound);
    app.use(errorHandler);

    const BACKEND_PORT = Number(PORT) || 5000;
    const server = app.listen(BACKEND_PORT,"0.0.0.0",() => {
        console.log(`Server is listening to the port: ${BACKEND_PORT}`);
        if (queueDashboardEnabled) {
            console.log(`BullMQ Dashboard available at: http://localhost:${BACKEND_PORT}/admin/queues`);
        }
    });

    /*
      Orderly shutdown, in the order that loses nothing: stop accepting connections, let in-flight
      requests finish, then close the queue workers and the database. A deploy sends SIGTERM, and
      the old behaviour — inherited from worker.ts, which exited as soon as the workers closed —
      could cut a request off mid-transaction.
     */
    const SHUTDOWN_GRACE_MS = 10_000;
    let shuttingDown = false;

    const shutdown = async (reason: string) => {
        if (shuttingDown) return;
        shuttingDown = true;
        console.log(`[shutdown] ${reason} — closing`);

        // A client holding a keep-alive connection open shouldn't hold the deploy open with it.
        const forceExit = setTimeout(() => {
            console.error("[shutdown] in-flight requests did not finish in time — exiting anyway");
            process.exit(1);
        }, SHUTDOWN_GRACE_MS);
        forceExit.unref();

        try {
            await new Promise<void>((resolve) => server.close(() => resolve()));
            await closeWorkers();
            await cache.close();
            await mongoose.disconnect();
            console.log("[shutdown] complete");
            process.exit(0);
        } catch (error) {
            console.error("[shutdown] failed:", error);
            process.exit(1);
        }
    };

    process.on("SIGTERM", () => void shutdown("SIGTERM"));
    process.on("SIGINT", () => void shutdown("SIGINT"));

    /*
      A rejection nobody handled would otherwise end the process with no context (and, on current
      Node, end it by default). Logged, then taken down the same orderly path.
     */
    process.on("unhandledRejection", (reason) => {
        console.error("[fatal] unhandled promise rejection:", reason);
        void shutdown("unhandledRejection");
    });

    process.on("uncaughtException", (error) => {
        console.error("[fatal] uncaught exception:", error);
        void shutdown("uncaughtException");
    });
}

main().catch((error) => {
    console.error("failed to start", error);
    process.exit(1);
})