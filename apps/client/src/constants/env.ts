import { AppError } from "@/utils/appError";

export const getEnv = (key : keyof ImportMetaEnv, defaultValue? : string) => {

    const value = import.meta.env[key] || defaultValue;

    if(!value) {
        throw new AppError(`Missing environment variable ${key}`);
    }
    return value;
}


export const API_URL = getEnv("VITE_API_URL");
export const GOOGLE_CLIENT_ID = getEnv("VITE_GOOGLE_CLIENT_ID");
export const GOOGLE_CLIENT_SECRET = getEnv("VITE_GOOGLE_CLIENT_SECRET");
