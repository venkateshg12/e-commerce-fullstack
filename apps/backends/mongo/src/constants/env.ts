
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