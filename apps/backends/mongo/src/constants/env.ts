
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
export const JWT_SECRET = getEnv("JWT_SECRET");
export const JWT_REFRESH_SECRET = getEnv("JWT_REFRESH_SECRET");
export const SMTP_HOST= getEnv("SMTP_HOST");
export const SMTP_PORT= getEnv("SMTP_PORT");
export const SMTP_USER = getEnv("SMTP_USER");
export const SMTP_PASSWORD= getEnv("SMTP_PASSWORD");
export const EMAIL_FROM = getEnv("EMAIL_FROM")