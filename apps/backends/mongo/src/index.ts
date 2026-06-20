import express from "express";
import "dotenv/config";
import { CORS_ORIGIN, PORT } from "./constants/env";
import cors from 'cors';
import morgan from "morgan";
import { ok } from "./utils/apiEnvelope";
import { notFound } from "./middleware/notFound";
import { errorHandler } from "./middleware/errorHandler";
import { connectDB } from "./config/db";

import { authRoutes } from "./routes/auth.route";
import cookieParser from "cookie-parser";
import { sendMail } from "./utils/sendMail";



async function main() {
    await connectDB();
    const app = express();

    const corsOrigin = (CORS_ORIGIN).split(",").map(origin => origin.trim()).filter(Boolean);

    app.use(cors({ origin: corsOrigin, credentials: true }));
    app.use(express.json());
    app.use(morgan('dev'));
    app.use(cookieParser());


    // Routes declaration.
    app.use("/auth", authRoutes);

    app.get("/health", async (req, res) => {
        res.status(200).json(ok({ message: "Server is running" }));
    })

    app.get("/send-test", async (_, res) => {
        await sendMail({
            to: "gvenkatesh9993@gmail.com",
            subject: "Testing Nodemailer",
            text: "Hello from GV Projects",
            html: "<h1>Hello from GV Projects</h1>",
        });

        res.send("Email Sent");
    });


    app.listen(PORT, () => { console.log(`Server is listening to the port: ${PORT}`) })

    // Error Handlers
    app.use(notFound);
    app.use(errorHandler);
}

main().catch((error) => {
    console.error("failed to start", error);
    process.exit(1);
})