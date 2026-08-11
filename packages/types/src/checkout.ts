import { z } from "zod";

export const createCheckoutSessionSchema = z.object({
    addressId: z.string().trim().min(1, { message: "Address ID is required" }),
    promoCode: z.string().trim().toUpperCase().optional(),
});

export type CreateCheckoutSessionSchema = z.infer<typeof createCheckoutSessionSchema>;
