import API from "@/lib/api";
import type {
    AdminOrderListResponse,
    OrderListResponse,
    OrderStatus,
    PaginatedResponse,
    SuccessResponse,
} from "@/types";
import type { UpdateOrderStatusSchema } from "@repo/types";

export const getOrders = async (): Promise<SuccessResponse<OrderListResponse>> => {
    const response = await API.get<SuccessResponse<OrderListResponse>>("/orders");
    return response.data;
};

// Paginated: this used to pull every order ever placed, with each line's product populated.
export const getAdminOrders = async (
    page = 1,
    limit = 50
): Promise<PaginatedResponse<AdminOrderListResponse>> => {
    const response = await API.get<PaginatedResponse<AdminOrderListResponse>>("/admin/orders", {
        params: { page, limit },
    });
    return response.data;
};

// The server only accepts moves listed in ORDER_STATUS_TRANSITIONS (@repo/types).
export const updateOrderStatus = async (
    orderId: string,
    payload: UpdateOrderStatusSchema
): Promise<SuccessResponse<{ _id: string; orderStatus: OrderStatus }>> => {
    const response = await API.patch<SuccessResponse<{ _id: string; orderStatus: OrderStatus }>>(
        `/orders/${orderId}/status`,
        payload
    );
    return response.data;
};

/*
  Customer return of a delivered order, inside the 7-day window the server enforces. The server
  restocks the items and credits the order total back as points, atomically — so the points balance
  and the stock both change with this one call.
 */
export const returnOrder = async (
    orderId: string
): Promise<SuccessResponse<{ _id: string; orderStatus: OrderStatus; returnedAt: string | null }>> => {
    const response = await API.patch<
        SuccessResponse<{ _id: string; orderStatus: OrderStatus; returnedAt: string | null }>
    >(`/orders/${orderId}/return`);
    return response.data;
};

// Customer cancel for an order that was never paid. The server first checks with Razorpay that no
// payment came through, so it can refuse (409) rather than cancel a paid order.
export const cancelOrder = async (
    orderId: string
): Promise<SuccessResponse<{ _id: string; orderStatus: OrderStatus; cancelledAt: string | null }>> => {
    const response = await API.patch<
        SuccessResponse<{ _id: string; orderStatus: OrderStatus; cancelledAt: string | null }>
    >(`/orders/${orderId}/cancel`);
    return response.data;
};
