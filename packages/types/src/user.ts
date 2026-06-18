import { z } from "zod";


export const credentialSchema = z.object({
    email: z.string().email().min(1).max(255),
    password: z.string().min(6, { message: "Password must be 6 characters long" }).max(255),
    userAgent: z.string().optional()
})

export type CredentialSchema = z.infer<typeof credentialSchema>;

// register inputs
export const registerInput = credentialSchema.extend({
    name: z.string().min(1).max(255),
    confirmPassword: z.string().min(6).max(255),
}).refine(
    (data) => data.password === data.confirmPassword, {
    message: "Password do not match",
    path: ["confirmPassword"]
}
)
export type RegisterInput = z.infer<typeof registerInput>;


// login inputs
export const signInInput = credentialSchema;
export type SignInInput = z.infer<typeof signInInput>;