import { z } from "zod";

// The windows the admin dashboard can be scoped to, in days.
export const DASHBOARD_RANGES = [7, 30, 90] as const;

export const dashboardQuerySchema = z.object({
    days: z.coerce
        .number()
        .refine((value) => (DASHBOARD_RANGES as readonly number[]).includes(value), {
            message: "Range must be 7, 30 or 90 days",
        })
        .default(30),
});

export type DashboardQuerySchema = z.infer<typeof dashboardQuerySchema>;
