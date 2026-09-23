import { AppError } from "@/utils/appError";

export const getEnv = (key: keyof ImportMetaEnv, defaultValue?: string) => {

    const value = import.meta.env[key] || defaultValue;

    if (!value) {
        throw new AppError(`Missing environment variable ${key}`);
    }
    return value;
}


export const IS_DEV = import.meta.env.DEV;
export const API_URL = getEnv("VITE_API_URL");
export const GOOGLE_CLIENT_ID = getEnv("VITE_GOOGLE_CLIENT_ID");