import express, { Router } from "express";
import { razorpayWebhookHandler } from "../controllers/webhook.controller";

export const webhookRouter = Router();

/*
  `express.raw` rather than the app-wide JSON parser: the signature is an HMAC over the bytes
  Razorpay sent, and any reparse-and-restringify would change them. Mounted in index.ts before
  `express.json()` for the same reason.
 */
webhookRouter.post(
    "/webhooks/razorpay",
    express.raw({ type: "application/json", limit: "1mb" }),
    razorpayWebhookHandler
);
