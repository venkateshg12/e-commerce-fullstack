export type UserRole = "user" | "admin";

export interface Address {
  _id: string;
  fullName: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  points: number;
  verified: boolean;
  avatar?: string;
  authProvider: "local" | "google";
  address: Address[];
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export type AppUser = {
  id: string;
  email?: string;
  name?: string;
  avatar?: string;
  role: UserRole;
};
