export type UserRole = "user" | "admin";

export type AppUser = {
    id : string;
    email? : string;
    name? : string;
    role : UserRole;
}

export type AppErrorItem = {
    message : string;
    code ?: string;
}

export type ApiEnvelope<T> = {
    status : "success" | "failure";
    data : T | null;
    meta? : Record<string, unknown>;
    errors? : AppErrorItem[]
}

export type ApiError = {
  errors?: {
    message: string;
  }[];
};