import { AppError } from "@/utils/appError";

export const getEnv = (key : keyof ImportMetaEnv, defaultValue? : string) => {

    const value = import.meta.env[key] || defaultValue;

    if(!value) {
        throw new AppError(`Missing environment variable ${key}`);
    }
    return value;
}


export const API_URL = getEnv("API_URL");
