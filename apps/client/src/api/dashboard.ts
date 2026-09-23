import API from "@/lib/api";
import type { DashboardResponse, SuccessResponse } from "@/types";

export const getDashboard = async (days: number): Promise<SuccessResponse<DashboardResponse>> => {
    const response = await API.get<SuccessResponse<DashboardResponse>>("/admin/dashboard", {
        params: { days },
    });
    return response.data;
};
