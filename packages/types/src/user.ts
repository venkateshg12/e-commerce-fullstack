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