export const DEFAULT_KEY_PREFIX = "rl:global";
export const AUTH_LOGIN_PREFIX = "rl:auth:login";
export const AUTH_REGISTER_PREFIX = "rl:auth:register";
export const AUTH_FORGOT_PASS_PREFIX = "rl:auth:forgot";
export const AUTH_VERIFY_PREFIX = "rl:auth:verify";
export const PUBLIC_API_PREFIX = "rl:public";
export const PROTECTED_API_PREFIX = "rl:protected";
export const ADMIN_API_PREFIX = "rl:admin";
export const LOCKOUT_PREFIX = "rl:lockout";

export const HTTP_HEADERS = {
    RETRY_AFTER: "Retry-After",
    RATELIMIT_LIMIT: "X-RateLimit-Limit",
    RATELIMIT_REMAINING: "X-RateLimit-Remaining",
    RATELIMIT_RESET: "X-RateLimit-Reset"
} as const;

export const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
export const ONE_HOUR_MS = 60 * 60 * 1000;
export const DEFAULT_MAX_REQUESTS = 100;

export const CIRCUIT_BREAKER_DEFAULTS = {
    FAILURE_THRESHOLD: 10,
    RESET_TIMEOUT_MS: 30000
};
