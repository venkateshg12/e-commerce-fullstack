import axios, { AxiosError } from "axios";
import { API_URL } from "@/constants/env";
import { clearUserQueries } from "@/lib/queryClient";
import { isServerUnavailable } from "@/lib/serverStatus";
import { useAuthStore } from "@/store/auth.store";
import { useServerStore } from "@/store/server.store";
import type { ApiError, RetryableRequestConfig, QueueItem } from "@/types";

// A free-tier backend can take up to a minute to boot, so a request must outlast that.
const REQUEST_TIMEOUT_MS = 60_000;
// A request still pending after this long is probably waiting on a sleeping server.
const WAKE_NOTICE_DELAY_MS = 3_000;
// A server that answered this recently is awake, so a slow request is just a slow request.
const AWAKE_WINDOW_MS = 2 * 60 * 1000;

let lastAnswerAt = 0;

const API = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: REQUEST_TIMEOUT_MS,
});


const refreshClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: REQUEST_TIMEOUT_MS,
});

const hasAnsweredRecently = () => Date.now() - lastAnswerAt < AWAKE_WINDOW_MS;

API.interceptors.request.use((config) => {
  const request = config as RetryableRequestConfig;
  clearTimeout(request._wakeTimer);
  if (!hasAnsweredRecently()) {
    request._wakeTimer = setTimeout(
      () => useServerStore.getState().markWaking(),
      WAKE_NOTICE_DELAY_MS
    );
  }
  return config;
});

// A real answer from the app (not the host's "still booting" page) means the server is awake.
const noteServerAnswered = (config?: RetryableRequestConfig) => {
  clearTimeout(config?._wakeTimer);
  lastAnswerAt = Date.now();
  useServerStore.getState().markReady();
};

// No answer, or the proxy's gateway error: the server isn't up yet. Offline is the user's own
// connection, not a sleeping server, so it doesn't raise the notice.
const noteServerUnavailable = (config?: RetryableRequestConfig) => {
  clearTimeout(config?._wakeTimer);
  if (navigator.onLine) useServerStore.getState().markWaking();
};

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
  (response) => {
    noteServerAnswered(response.config as RetryableRequestConfig);
    return response;
  },
  async (error: AxiosError<ApiError>) => {
    const config = error.config as RetryableRequestConfig | undefined;

    // No response at all = network/timeout error, not an HTTP error.
    if (!error.response) {
      noteServerUnavailable(config);
      return Promise.reject<ApiError>({
        status: 0,
        message: "Network error. Please check your internet connection.",
      });
    }

    const { status, data } = error.response;

    if (isServerUnavailable(status)) {
      noteServerUnavailable(config);
    } else {
      noteServerAnswered(config);
    }

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