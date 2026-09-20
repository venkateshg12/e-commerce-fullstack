import { RequestHandler } from "express";
import crypto from "crypto";

/**
 * Lightweight middleware that provides an anonymous browser fairness identity.
 * 
 * Flow:
 * 1. Checks if `req.cookies.visitorId` exists and is valid.
 * 2. If missing or malformed, generates an opaque UUID v4.
 * 3. Issues an HttpOnly, SameSite=Lax cookie with path "/" and 1-year expiration.
 * 4. Attaches `req.visitorId` for consumption by subsequent rate limiters.
 * 
 * Note: `visitorId` is a fairness identity for unauthenticated browser sessions,
 * NOT a security boundary. IP aggregate rate limiting runs alongside it to prevent
 * abuse via cookie deletion.
 */
export const visitorIdMiddleware: RequestHandler = (req, res, next) => {
    let visitorId = req.cookies?.visitorId;

    if (!visitorId || typeof visitorId !== "string" || visitorId.length > 100) {
        visitorId = crypto.randomUUID();
        res.cookie("visitorId", visitorId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 365 * 24 * 60 * 60 * 1000
        });
    }

    req.visitorId = visitorId;
    next();
};
