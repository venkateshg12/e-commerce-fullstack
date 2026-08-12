import { createRateLimiter } from "../middleware/rateLimiter";
import { extractClientIp } from "../utils/rateLimiter/ipExtractor";
import { RateLimiterRequest } from "../types/rateLimiter.types";
import {
    ADMIN_API_PREFIX,
    AUTH_FORGOT_PASS_PREFIX,
    AUTH_LOGIN_PREFIX,
    AUTH_REGISTER_PREFIX,
    AUTH_VERIFY_PREFIX,
    ONE_HOUR_MS,
    PROTECTED_API_PREFIX,
    PUBLIC_API_PREFIX
} from "../constants/rateLimiter.constant";

export const loginLimiter = createRateLimiter({
    prefix: AUTH_LOGIN_PREFIX,
    windowMs: 15 * 60 * 1000,
    blockDurationMs: ONE_HOUR_MS,
    max: 10,
    keyResolver: (req: RateLimiterRequest) => {
        const ip = extractClientIp(req);
        const email = req.body?.email ? String(req.body.email).toLowerCase().trim() : "anonymous";
        return `ip:${ip}:email:${email}`;
    },
});

export const registerLimiter = createRateLimiter({
    prefix: AUTH_REGISTER_PREFIX,
    windowMs: 15 * 60 * 1000,
    blockDurationMs: ONE_HOUR_MS,
    max: 3,
    keyResolver: (req: RateLimiterRequest) => `ip:${extractClientIp(req)}`,
});

export const forgotPasswordLimiter = createRateLimiter({
    prefix: AUTH_FORGOT_PASS_PREFIX,
    windowMs: 15 * 60 * 1000,
    blockDurationMs: ONE_HOUR_MS,
    max: 3,
    keyResolver: (req: RateLimiterRequest) => {
        const ip = extractClientIp(req);
        const email = req.body?.email ? String(req.body.email).toLowerCase().trim() : "anonymous";
        return `ip:${ip}:email:${email}`;
    },
});

export const verifyEmailLimiter = createRateLimiter({
    prefix: AUTH_VERIFY_PREFIX,
    windowMs: 15 * 60 * 1000,
    blockDurationMs: ONE_HOUR_MS,
    max: 5,
    keyResolver: (req: RateLimiterRequest) => `ip:${extractClientIp(req)}`,
});

export const publicApiLimiter = createRateLimiter({
    prefix: PUBLIC_API_PREFIX,
    windowMs: 15 * 60 * 1000,
    blockDurationMs: ONE_HOUR_MS,
    max: 100,
    keyResolver: (req: RateLimiterRequest) => `ip:${extractClientIp(req)}`,
   
});

export const protectedApiLimiter = createRateLimiter({
    prefix: PROTECTED_API_PREFIX,
    windowMs: 15 * 60 * 1000,
    max: 200,
    keyResolver: (req: RateLimiterRequest) => `ip:${extractClientIp(req)}`,
   
});

export const adminApiLimiter = createRateLimiter({
    prefix: ADMIN_API_PREFIX,
    windowMs: 15 * 60 * 1000,
    blockDurationMs: ONE_HOUR_MS,
    max: 50,
    keyResolver: (req: RateLimiterRequest) => `ip:${extractClientIp(req)}`,
});