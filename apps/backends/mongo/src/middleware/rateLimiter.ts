import { RequestHandler, Request, Response, NextFunction } from "express";
import { RateLimiterAlgorithm, RateLimiterOptions, RateLimiterStore } from "../types/rateLimiter.types";
import { TOO_MANY_REQUESTS } from "../constants/https";
import { extractClientIp } from "../utils/rateLimiter/ipExtractor";
import { RedisRateLimiterStore } from "../utils/rateLimiter/redisStore";
import { DEFAULT_KEY_PREFIX, HTTP_HEADERS } from "../constants/rateLimiter.constant";
import { fail } from "../utils/api";
import { catchError } from "../utils/errors";

let defaultStore: RateLimiterStore | null = null;

function getDefaultStore(): RateLimiterStore {
    if (!defaultStore) {
        defaultStore = new RedisRateLimiterStore();
    }
    return defaultStore;
}

export function createRateLimiter(options: RateLimiterOptions): RequestHandler {
    const prefix = options.prefix || DEFAULT_KEY_PREFIX;
    const windowMs = options.windowMs;
    const blockDurationMs = options.blockDurationMs || windowMs;
    const algorithm = options.algorithm || RateLimiterAlgorithm.SLIDING_WINDOW;
    const store = options.store || getDefaultStore();

    const keyResolver = options.keyResolver || ((req: Request) => extractClientIp(req));

    return catchError(async (req: Request, res: Response, next: NextFunction) => {
        if (options.skip && (await options.skip(req))) {
            return next();
        }

        const resolvedKey = await keyResolver(req);
        const fullKey = `${prefix}:${resolvedKey}`;

        const maxLimit = typeof options.max === "function" ? await options.max(req) : options.max;

        
        /*
               max: async (req) => { // ◄── typeof is "function"
               const user = await getUserFromDb(req.user.id);
               return user.isPremium ? 1000 : 100;
                }

            this situations may occur that's why we write "maxLimt" as a function.
         */

        const result = await store.increment(fullKey, windowMs, maxLimit, algorithm, blockDurationMs);

        const retryAfterSeconds = Math.max(1, Math.ceil((result.resetTimeMs - Date.now()) / 1000));
        res.setHeader(HTTP_HEADERS.RATELIMIT_LIMIT, maxLimit);
        res.setHeader(HTTP_HEADERS.RATELIMIT_REMAINING, result.remaining);
        res.setHeader(HTTP_HEADERS.RATELIMIT_RESET, Math.ceil(result.resetTimeMs / 1000));

        if (result.allowed) {
            return next();
        }

        const mins = result.retryAfterMinutes;
        const errorMessage = mins > 0
            ? `Please try again after ${mins} minutes`
            : "Please try again after some time";

        res.setHeader(HTTP_HEADERS.RETRY_AFTER, retryAfterSeconds);
        res.status(TOO_MANY_REQUESTS).json(fail(errorMessage, "TOO_MANY_REQUESTS"));
    });
}
