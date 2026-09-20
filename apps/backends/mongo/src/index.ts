import "dotenv/config";
import express from "express";
import {
    CORS_ORIGIN,
    ENABLE_QUEUE_DASHBOARD,
    NODE_ENV,
    PORT,
    QUEUE_DASHBOARD_PASSWORD,
    QUEUE_DASHBOARD_USER,
} from "./constants/env";
import helmet from "helmet";
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
import "./worker";




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

    app.set("trust proxy", 1);

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
    app.use(express.json());
    app.use(morgan('dev'));
    app.use(cookieParser());
    app.use(visitorIdMiddleware);
    app.use(globalLimiter);


    /*
      Health check first. Several routers are mounted at "/" and call `router.use(authenticate)`,
      which runs for every request that reaches them regardless of path — so a route declared
      after them answers 401 instead of its own response, as /health did.
     */
    app.get("/health", async (req, res) => {
        res.status(200).json(ok({ message: "Server is running" }));
    });

    // Routes declaration.
    app.use("/auth", authRoutes);
    app.use("/session", sessionRoutes);
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
    app.use("/", homeRouter);

    // Registered before listening, so a request can never arrive at a server whose 404 and error
    // handlers aren't mounted yet.
    app.use(notFound);
    app.use(errorHandler);

    app.listen(PORT, () => {
        console.log(`Server is listening to the port: ${PORT}`);
        if (queueDashboardEnabled) {
            console.log(`BullMQ Dashboard available at: http://localhost:${PORT}/admin/queues`);
        }
    });
}

main().catch((error) => {
    console.error("failed to start", error);
    process.exit(1);
})