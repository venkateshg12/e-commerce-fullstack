import "dotenv/config";
import { webcrypto } from "node:crypto";

if (!globalThis.crypto) {
    Object.defineProperty(globalThis, "crypto", {
        value: webcrypto,
        writable: false,
        configurable: true,
    });
}

import express from "express";
import { CORS_ORIGIN, NODE_ENV, PORT } from "./constants/env";
import cors from 'cors';
import morgan from "morgan";
import { ok } from "./utils/apiEnvelope";
import { notFound } from "./middleware/notFound";
import { errorHandler } from "./middleware/errorHandler";
import { connectDB } from "./config/db";
import { authRoutes } from "./routes/auth.route";
import cookieParser from "cookie-parser";
import sessionRoutes from "./routes/session.route";

// Bull Board imports
import { ExpressAdapter } from "@bull-board/express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { emailQueue } from "./jobs/queues/email.queue";

async function main() {
    await connectDB();
    const app = express();

    // BullMQ Dashboard Setup (Development only for security)
    if (NODE_ENV !== "production") {
        const serverAdapter = new ExpressAdapter();
        serverAdapter.setBasePath("/admin/queues");

        createBullBoard({
            queues: [new BullMQAdapter(emailQueue)],
            serverAdapter: serverAdapter,
        });

        app.use("/admin/queues", serverAdapter.getRouter());
    }

    app.set("trust proxy", 1);

    const corsOrigin = (CORS_ORIGIN).split(",").map(origin => origin.trim()).filter(Boolean);

    app.use(cors({ origin: corsOrigin, credentials: true }));
    app.use(express.json());
    app.use(morgan('dev'));
    app.use(cookieParser());


    // Routes declaration.
    app.use("/auth", authRoutes);
    app.use("/session", sessionRoutes);

    app.get("/health", async (req, res) => {
        res.status(200).json(ok({ message: "Server is running" }));
    })

    app.listen(PORT, () => {
        console.log(`Server is listening to the port: ${PORT}`);
        if (NODE_ENV !== "production") {
            console.log(`BullMQ Dashboard available at: http://localhost:${PORT}/admin/queues`);
        }
    });

    // Error Handlers
    app.use(notFound);
    app.use(errorHandler);
}

main().catch((error) => {
    console.error("failed to start", error);
    process.exit(1);
})