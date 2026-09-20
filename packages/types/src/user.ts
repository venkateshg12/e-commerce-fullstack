import { z } from "zod";


export const credentialSchema = z.object({
    email: z.string().email().min(1).max(255),
    password: z.string().min(6, { message: "Password must be 6 characters long" }).max(255),
    userAgent: z.string().optional()
})

export const credentialsDataSchema = credentialSchema.extend({
    name: z.string().min(1).max(255)
})

export type CredentialSchema = z.infer<typeof credentialsDataSchema>;

// register inputs
const registerFieldsSchema = credentialSchema.extend({
    name: z.string().min(1).max(255),
    confirmPassword: z.string().min(6).max(255),
})

export const registerSchema = registerFieldsSchema.refine(
    (data) => data.password === data.confirmPassword, {
    message: "Password do not match",
    path: ["confirmPassword"]
}
)
export type RegisterSchema = z.infer<typeof registerSchema>;


// login inputs
export const loginInSchema = credentialSchema;
export type LoginInSchema = z.infer<typeof loginInSchema>;


// email input for forgot password
export const emailSchema = credentialSchema.pick({ email: true });
export type EmailSchema = z.infer<typeof emailSchema>


// password validation
export const resetPasswordSchema = registerFieldsSchema.pick({
    password: true,
    confirmPassword: true
}).refine(
    (data) => data.password === data.confirmPassword, {
    message: "Password do not match",
    path: ["confirmPassword"]
})


export type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>;

export const addressSchema = z.object({
    fullName: z.string().trim().min(1, { message: "Full name is required" }),
    address: z.string().trim().min(1, { message: "Address is required" }),
    state: z.string().trim().min(1, { message: "State is required" }),
    city: z.string().trim().min(1, { message: "City is required" }),
    country: z.string().trim().default("India"),
    postalCode: z.string().trim().min(1, { message: "Postal code is required" }),
    isDefault: z.boolean().default(false),
});

export type AddressSchema = z.infer<typeof addressSchema>;

export const updateAddressSchema = addressSchema.partial();
export type UpdateAddressSchema = z.infer<typeof updateAddressSchema>;

export const updateProfileSchema = z.object({
    name: z.string().trim().min(1, { message: "Name is required" }).max(255),
});
export type UpdateProfileSchema = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, { message: "Current password is required" }),
    newPassword: z.string().min(6, { message: "Password must be 6 characters long" }).max(255),
    confirmNewPassword: z.string().min(6).max(255),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
}).refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from the current password",
    path: ["newPassword"],
});
export type ChangePasswordSchema = z.infer<typeof changePasswordSchema>;