
const getEnv = (key: string, defaultValue?: string) => {

    const value = process.env[key] || defaultValue;

    if (value === undefined) {
        throw new Error(`Missing Environment varaible ${key}`)
    }

    return value;
}

export const PORT = getEnv("PORT");
export const MONGO_URI = getEnv("MONGO_URI");
export const CORS_ORIGIN = getEnv("CORS_ORIGIN");
export const CLIENT_URL = getEnv("CLIENT_URL", CORS_ORIGIN.split(",")[0].trim());
export const JWT_SECRET = getEnv("JWT_SECRET");
export const JWT_REFRESH_SECRET = getEnv("JWT_REFRESH_SECRET");
export const DATABASE_URL = getEnv("DATABASE_URL");
const MIN_JWT_SECRET_LENGTH = 32;

if (JWT_SECRET.length < MIN_JWT_SECRET_LENGTH || JWT_REFRESH_SECRET.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(
        `JWT_SECRET and JWT_REFRESH_SECRET must each be at least ${MIN_JWT_SECRET_LENGTH} characters (generate with: openssl rand -hex 32)`
    );
}

if (JWT_SECRET === JWT_REFRESH_SECRET) {
    throw new Error("JWT_SECRET and JWT_REFRESH_SECRET must be different values");
}
export const SMTP_HOST = getEnv("SMTP_HOST");
export const SMTP_PORT = getEnv("SMTP_PORT");
export const SMTP_USER = getEnv("SMTP_USER");
export const SMTP_PASSWORD = getEnv("SMTP_PASSWORD");
export const EMAIL_FROM = getEnv("EMAIL_FROM");
export const GOOGLE_CLIENT_ID = getEnv("GOOGLE_CLIENT_ID");
export const NODE_ENV = getEnv("NODE_ENV");
export const TRUSTED_PROXY_CIDRS = getEnv("TRUSTED_PROXY_CIDRS", "");
export const ENABLE_QUEUE_DASHBOARD = getEnv("ENABLE_QUEUE_DASHBOARD", "false");
export const QUEUE_DASHBOARD_USER = getEnv("QUEUE_DASHBOARD_USER", "");
export const QUEUE_DASHBOARD_PASSWORD = getEnv("QUEUE_DASHBOARD_PASSWORD", "");
export const REDIS_HOST = getEnv("REDIS_HOST");
export const REDIS_PORT = getEnv("REDIS_PORT");
export const CACHE_REDIS_HOST = getEnv("CACHE_REDIS_HOST", REDIS_HOST);
export const CACHE_REDIS_PORT = getEnv("CACHE_REDIS_PORT", "6380");
export const CACHE_ENABLED = getEnv("CACHE_ENABLED", "true");
export const RESEND_API_KEY = getEnv("RESEND_API_KEY");
export const CLOUDINARY_CLOUD_NAME = getEnv("CLOUDINARY_CLOUD_NAME");
export const CLOUDINARY_API_KEY = getEnv("CLOUDINARY_API_KEY");
export const CLOUDINARY_API_SECRET = getEnv("CLOUDINARY_API_SECRET");
export const UV_THREADPOOL_SIZE = getEnv("UV_THREADPOOL_SIZE");
export const RAZORPAY_KEY_ID = getEnv("RAZORPAY_KEY_ID");
export const RAZORPAY_KEY_SECRET = getEnv("RAZORPAY_KEY_SECRET");
export const RAZORPAY_WEBHOOK_SECRET = getEnv("RAZORPAY_WEBHOOK_SECRET", "");