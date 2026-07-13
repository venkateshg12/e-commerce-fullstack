export type UserRole = "user" | "admin";

export interface SuccessResponse<T> {
    status: "success";
    data: T;
}

export interface FailureResponse {
  status: "error";
  data: null;
  errors: ApiError[];
}

export interface ApiError {
  path?: string;
  message: string;
  code?: string;
}


export interface RegisterResponse {
  title: string;
  message: string;
}

export interface LoginResponse {
  user : User,
  message : string,
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  points: number;
  verified: boolean;
  address: unknown[];
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface VerifiedResponse {
  message : string;
}

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

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export type AlertType = "success" | "error" | "info" | "warning";

export interface AlertPopupProps {
  isOpen: boolean;
  type: AlertType;
  title: string;
  description: string;
  onClose: () => void;
  actionLabel?: string;
  onAction?: () => void;
  autoCloseDuration?: number;
}


