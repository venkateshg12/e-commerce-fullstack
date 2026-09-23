import type { Address, User } from "./user.types";

export type UpdateProfilePayload = { name: string };
export type UpdateProfileResponse = { user: User };
export type UpdateAvatarResponse = { user: User };

export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
};
export type ChangePasswordResponse = { message: string };

export type AddressListResponse = Address[];
