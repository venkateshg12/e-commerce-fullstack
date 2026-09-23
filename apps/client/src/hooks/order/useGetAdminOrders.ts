import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getAdminOrders } from "@/api/order";
import type { AdminOrderListResponse, FailureResponse, PaginatedResponse } from "@/types";

/*
  A batch of orders, not the entire history. Deliberately the largest page the API allows: the
  table's own status filter, search and numbered pages work within what has been loaded, so a big
  batch keeps that behaviour intact while still bounding the request. Shops with more orders than
  this get a batch pager under the table.
 */
export const ADMIN_ORDERS_PAGE_SIZE = 100;

export const useGetAdminOrders = (page: number = 1) => {
    return useQuery<PaginatedResponse<AdminOrderListResponse>, FailureResponse>({
        queryKey: ["admin-orders", page],
        queryFn: () => getAdminOrders(page, ADMIN_ORDERS_PAGE_SIZE),
        staleTime: 30 * 1000,
        placeholderData: keepPreviousData,
    });
};
