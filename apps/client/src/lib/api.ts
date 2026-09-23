import axios, { AxiosError } from "axios";
import { API_URL } from "@/constants/env";
import { clearUserQueries } from "@/lib/queryClient";
import { useAuthStore } from "@/store/auth.store";
import type { ApiError, RetryableRequestConfig, QueueItem } from "@/types";


const API = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 15000,
});


const refreshClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

//Refresh-queue state

let isRefreshing = false;
let failedQueue: QueueItem[] = [];

const processQueue = (error: unknown | null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve();
  });
  failedQueue = [];
};

const AUTH_ROUTES = [
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/auth/password",
  "/auth/verify",
];

const isAuthRoute = (url?: string): boolean =>
  !!url && AUTH_ROUTES.some((route) => url.includes(route));

API.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    // No response at all = network/timeout error, not an HTTP error.
    if (!error.response) {
      return Promise.reject<ApiError>({
        status: 0,
        message: "Network error. Please check your internet connection.",
      });
    }

    const { status, data } = error.response;
    const config = error.config as RetryableRequestConfig | undefined;

    const shouldAttemptRefresh =
      status === 401 && config && !isAuthRoute(config.url) && !config._retry;

    if (shouldAttemptRefresh) {
      // If a refresh is already in flight, queue this request until it resolves.
      if (isRefreshing) {
        return new Promise<void>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => API(config));
      }

      config._retry = true;
      isRefreshing = true;

      try {
        await refreshClient.get("/auth/refresh");
        processQueue(null);
        return API(config);
      } catch (refreshError) {
        processQueue(refreshError);
        useAuthStore.getState().clearAuth();
        // An expired session ends the same way a logout does, so the cart, wishlist and orders
        // of the session that just died don't linger in the header or on the next page.
        clearUserQueries();
        return Promise.reject<ApiError>({
          status: 401,
          message: "Session expired. Please log in again.",
        });
      } finally {
        isRefreshing = false;
      }
    }

    const firstError = data?.errors?.[0];
    const message = firstError?.message || data?.message || "Something went wrong.";
    const code = firstError?.code || (data as Record<string, unknown>)?.code;

    return Promise.reject<ApiError>({
      ...(data as Record<string, unknown>),
      message,
      code: code ? String(code) : undefined,
      errors: data?.errors,
      status, // ensures status matches the response status
    });
  }
);

export default API;


/*

 5 Requests
      │
      ▼
401 401 401 401 401
      │
      ▼
First Request
      │
      ▼
isRefreshing = true
      │
      ▼
GET /auth/refresh
      │
      ▼
Other 4 Requests
      │
      ▼
Wait in failedQueue
      │
      ▼
Refresh Success
      │
      ▼
processQueue(null)
      │
      ▼
resolve() all waiting Promises
      │
      ▼
.then(() => API(config))
      │
      ▼
Retry Original Requests
      │
      ▼
    200 OK

 */