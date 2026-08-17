import { z } from "zod";

export const promoFieldsSchema = z.object({
    code: z.string().trim().min(1, { message: "Promo code is required" }).toUpperCase(),
    percentage: z.number().min(1, { message: "Percentage must be at least 1" }).max(100, { message: "Percentage cannot exceed 100" }),
    count: z.number().min(0, { message: "Count must be at least 0" }).default(0),
    minimumOrderValue: z.number().min(0, { message: "Minimum order value must be at least 0" }).default(0),
    startsAt: z.coerce.date({ message: "Start date is required" }),
    endsAt: z.coerce.date({ message: "End date is required" }),
});

export const createPromoSchema = promoFieldsSchema.refine(
    (data) => data.endsAt > data.startsAt,
    {
        message: "End date must be after start date",
        path: ["endsAt"],
    }
);

export type CreatePromoSchema = z.infer<typeof createPromoSchema>;

export const promoSchema = createPromoSchema;
export type PromoSchema = z.infer<typeof promoSchema>;

export const updatePromoSchema = promoFieldsSchema.partial().refine(
    (data) => {
        if (data.startsAt && data.endsAt) {
            return data.endsAt > data.startsAt;
        }
        return true;
    },
    {
        message: "End date must be after start date",
        path: ["endsAt"],
    }
);

export type UpdatePromoSchema = z.infer<typeof updatePromoSchema>;

export const applyPromoSchema = z.object({
    code: z.string().trim().min(1, { message: "Promo code is required" }).toUpperCase(),
});
export type ApplyPromoSchema = z.infer<typeof applyPromoSchema>;
