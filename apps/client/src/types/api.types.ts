import type { InternalAxiosRequestConfig } from "axios";

export interface SuccessResponse<T> {
  status: "success";
  data: T;
  meta?: Record<string, unknown>;
}

/*
  What a paginated list endpoint puts in the envelope's `meta`, next to the rows in `data`.
  Listings are paginated server-side, so `hasMore` is the only honest way to know whether to ask
  for another page.
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface PaginatedResponse<T> extends Omit<SuccessResponse<T>, "meta"> {
  meta?: PaginationMeta;
}

export interface ApiErrorDetail {
  path?: string; // field this error belongs to (e.g. for Zod validation errors)
  message: string;
  code?: string;
}

// Single unified API error interface used across the entire frontend
export interface ApiError {
  status: number;
  message: string;
  code?: string;
  errors?: ApiErrorDetail[];
  data?: null;
  [key: string]: unknown;
}

/**
 * The error every mutation hook is typed with. The axios interceptor in `lib/api.ts` rejects with
 * a normalized `ApiError`, which carries a flattened `message`/`code` alongside the envelope —
 * callers read `error.message`, so it is declared here rather than being cast at each call site.
 *
 * Worth tidying later: the hooks would be more honest typed with `ApiError` directly, since that
 * is what they actually receive, and this type kept for the server's error envelope alone.
 */
export interface FailureResponse {
  status: "error";
  data: null;
  errors: ApiErrorDetail[];
  message?: string;
  code?: string;
}

export type ApiEnvelope<T> =
  | {
      status: "success";
      data: T;
      meta?: Record<string, unknown>;
      errors?: never;
    }
  | {
      status: "error";
      data: null;
      meta?: Record<string, unknown>;
      errors: ApiErrorDetail[];
    };

export interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export interface QueueItem {
  resolve: () => void;
  reject: (reason: unknown) => void;
}
