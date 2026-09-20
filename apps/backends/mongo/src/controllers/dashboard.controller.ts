import { OK } from "../constants/https";
import { dashboardQuerySchema } from "@repo/types";
import { getDashboardLiteService, getDashboardService } from "../services/dashboard.service";
import { catchError, ok } from "../utils";

export const getDashboardLiteHandler = catchError(
    async (req, res) => {
        const stats = await getDashboardLiteService();
        return res.status(OK).json(ok(stats));
    }
);

export const getDashboardHandler = catchError(
    async (req, res) => {
        const { days } = dashboardQuerySchema.parse(req.query);
        const dashboard = await getDashboardService(days);
        return res.status(OK).json(ok(dashboard));
    }
);
