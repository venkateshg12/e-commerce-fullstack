import { API_URL } from "@/constants/env";
import axios, { type AxiosRequestConfig } from "axios";
import type { ApiEnvelope, ApiError } from "./types";
import { AppError } from "@/utils/appError";

let tokenGetter: (() => Promise<string | null>) | null = null;

/**
 * Set the token getter function used to retrieve the bearer token for authorization.
 */
export function setApiTokenGetter(getter: () => Promise<string | null>) {
  tokenGetter = getter;
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: false,
});

api.interceptors.request.use(async (config) => {
  if (!tokenGetter) {
    return config;
  }

  const token = await tokenGetter();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

/**
 * Generic request wrapper to centralize response envelope handling and error mapping.
 */
async function request<T>(
  execute: () => Promise<{ data: ApiEnvelope<T> }>
): Promise<T> {
  try {
    const response = await execute();
    if (response.data.status !== "success") {
      throw new AppError(
        response.data.errors?.[0]?.message || "Request failed"
      );
    }
    // Type assert the envelope data since status is 'success'
    return response.data.data as T;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(getErrorMsg(error));
  }
}

/**
 * Perform a GET request to the API.
 */
export async function apiGet<T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {
  return request<T>(() => api.get<ApiEnvelope<T>>(url, config));
}

/**
 * Perform a POST request to the API.
 */
export async function apiPost<T, D = any>(
  url: string,
  data?: D,
  config?: AxiosRequestConfig
): Promise<T> {
  return request<T>(() => api.post<ApiEnvelope<T>>(url, data, config));
}

/**
 * Perform a PUT request to the API.
 */
export async function apiPut<T, D = any>(
  url: string,
  data?: D,
  config?: AxiosRequestConfig
): Promise<T> {
  return request<T>(() => api.put<ApiEnvelope<T>>(url, data, config));
}

/**
 * Perform a PATCH request to the API.
 */
export async function apiPatch<T, D = any>(
  url: string,
  data?: D,
  config?: AxiosRequestConfig
): Promise<T> {
  return request<T>(() => api.patch<ApiEnvelope<T>>(url, data, config));
}

/**
 * Perform a DELETE request to the API.
 */
export async function apiDelete<T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {
  return request<T>(() => api.delete<ApiEnvelope<T>>(url, config));
}

/**
 * Extract an error message from any caught Axios error or generic Error.
 */
function getErrorMsg(error: unknown): string {
  if (axios.isAxiosError<ApiError>(error)) {
    return (
      error.response?.data?.errors?.[0]?.message ??
      error.message ??
      "Request failed"
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong!";
}