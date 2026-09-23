import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { CORS_ORIGIN, NODE_ENV, PORT } from "./constants/env";
import { ok } from "./utils/api/apiEnvelope";
import { notFound } from "./middleware/notFound";
import { errorHandler } from "./middleware/errorHandler";
import { db, pool } from "./config/db";

async function main() {
    // Fail at boot, not on the first request, if the database is unreachable.
    await db.connect();

    const app = express();

    // Baseline response headers. `crossOriginResourcePolicy` is relaxed because the storefront is
    // served from another origin.
    app.use(
        helmet({
            crossOriginResourcePolicy: { policy: "cross-origin" },
            hsts: NODE_ENV === "production" ? undefined : false,
        })
    );

    const corsOrigin = CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean);
    app.use(cors({ origin: corsOrigin, credentials: true }));

    app.use(express.json());
    app.use(morgan(NODE_ENV === "production" ? "combined" : "dev"));
    app.use(cookieParser());

    // Reports the dependency, not just the process: a 200 while Postgres is unreachable would keep
    // a load balancer sending traffic to an instance that can't serve a request.
    app.get("/health", async (_req, res) => {
        const postgresUp = await pool.query("SELECT 1").then(
            () => true,
            () => false
        );

        return res.status(postgresUp ? 200 : 503).json(
            ok({
                status: postgresUp ? "ok" : "degraded",
                postgres: postgresUp ? "up" : "down",
            })
        );
    });

    // Feature routers get mounted here, one phase at a time.

    // Registered before listening, so a request can never arrive at a server whose 404 and error
    // handlers aren't mounted yet.
    app.use(notFound);
    app.use(errorHandler);

    const server = app.listen(PORT, () => {
        console.log(`Server is listening to the port: ${PORT}`);
    });

    // Stop accepting connections, let in-flight requests finish, then close the database.
    const shutdown = (reason: string) => {
        console.log(`[shutdown] ${reason} — closing`);
        server.close(async () => {
            await db.close();
            console.log("[shutdown] complete");
            process.exit(0);
        });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((error) => {
    console.error("[startup] failed:", error);
    process.exit(1);
});
