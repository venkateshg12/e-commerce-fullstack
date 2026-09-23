import ListPagination from "@/components/common/ListPagination";
import OrderDetailSheet from "@/components/admin/orders/OrderDetailSheet";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import AdminPager from "@/components/admin/AdminPager";
import { ADMIN_ORDERS_PAGE_SIZE, useGetAdminOrders } from "@/hooks/order/useGetAdminOrders";
import {
  ORDER_STATUS_META,
  PAYMENT_STATUS_META,
  formatOrderDate,
  formatRupees,
} from "@/lib/orderStatus";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types";
import { ALLOWED_ORDER_STATUSES } from "@repo/types";
import { ChevronRight, Search } from "lucide-react";
import { useState } from "react";

const PAGE_SIZE = 10;

type StatusFilter = "all" | OrderStatus;

const AdminOrders = () => {
  // Which batch of orders is loaded. The numbered pages below page WITHIN this batch.
  const [batch, setBatch] = useState(1);
  const { data, isPending, isError } = useGetAdminOrders(batch);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  // Track the id, not the object: the sheet then always shows the live row, so a status change
  // appears in it as soon as the list refetches.
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const orders = data?.data.items ?? [];
  const totalOrders = data?.meta?.total ?? orders.length;
  const hasOlderOrders = data?.meta?.hasMore ?? false;

  const countByStatus = orders.reduce<Record<string, number>>((counts, order) => {
    counts[order.orderStatus] = (counts[order.orderStatus] ?? 0) + 1;
    return counts;
  }, {});

  const query = search.trim().toLowerCase();
  const filteredOrders = orders.filter((order) => {
    if (statusFilter !== "all" && order.orderStatus !== statusFilter) return false;
    if (!query) return true;
    return [order.code, order.customerName, order.customerEmail, order.deliveryName].some((field) =>
      field?.toLowerCase().includes(query)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  // Clamped by derivation, so an order leaving the current filter can't strand an empty page.
  const currentPage = Math.min(page, totalPages);
  const rangeStart = (currentPage - 1) * PAGE_SIZE;
  const visibleOrders = filteredOrders.slice(rangeStart, rangeStart + PAGE_SIZE);

  const selectedOrder = orders.find((order) => order._id === selectedOrderId) ?? null;

  // Filters reset to page 1 in the handlers themselves rather than via an effect.
  const changeFilter = (next: StatusFilter) => {
    setStatusFilter(next);
    setPage(1);
  };

  const filterOptions: Array<{ value: StatusFilter; label: string; count: number }> = [
    { value: "all", label: "All", count: orders.length },
    ...ALLOWED_ORDER_STATUSES.map((status) => ({
      value: status,
      label: ORDER_STATUS_META[status].label,
      count: countByStatus[status] ?? 0,
    })),
  ];

  const renderBody = () => {
    if (isPending) {
      return (
        <div className="space-y-2 p-4" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={`order-row-skeleton-${index}`} className="h-12 w-full rounded-md" />
          ))}
        </div>
      );
    }

    if (isError) {
      return <p className="dash-empty">Couldn't load orders. Please refresh and try again.</p>;
    }

    if (filteredOrders.length === 0) {
      return (
        <p className="dash-empty">
          {orders.length === 0 ? "No orders yet." : "No orders match these filters."}
        </p>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Order</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead className="text-right">Items</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-10 pr-4">
              <span className="sr-only">Open</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleOrders.map((order) => (
            <TableRow
              key={order._id}
              className="admin-orders-row"
              tabIndex={0}
              aria-label={`Open order ${order.code}`}
              onClick={() => setSelectedOrderId(order._id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedOrderId(order._id);
                }
              }}
            >
              <TableCell className="pl-4">
                <p className="admin-orders-code">#{order.code}</p>
                <p className="admin-orders-sub">{formatOrderDate(order.createdAt)}</p>
              </TableCell>
              <TableCell>
                <p className="text-sm text-foreground">{order.customerName || "—"}</p>
                <p className="admin-orders-sub">{order.customerEmail}</p>
              </TableCell>
              <TableCell className="text-right tabular-nums">{order.totalItems}</TableCell>
              <TableCell className="text-right">
                <span className="admin-orders-amount">{formatRupees(order.totalAmount)}</span>
              </TableCell>
              <TableCell>
                <Badge variant={PAYMENT_STATUS_META[order.paymentStatus].variant}>
                  {PAYMENT_STATUS_META[order.paymentStatus].label}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={ORDER_STATUS_META[order.orderStatus].variant}>
                  {ORDER_STATUS_META[order.orderStatus].label}
                </Badge>
              </TableCell>
              <TableCell className="pr-4 text-muted-foreground">
                <ChevronRight className="h-4 w-4" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="admin-orders-page">
      <div>
        <h1 className="dash-title">Orders</h1>
        <p className="dash-subtitle">
          {totalOrders} {totalOrders === 1 ? "order" : "orders"} · click one to see its items and
          update its status.
        </p>
      </div>

      <div className="admin-orders-toolbar">
        <div className="admin-orders-search">
          <Search className="admin-orders-search-icon" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search by order #, customer or email"
            className="pl-9"
            aria-label="Search orders"
          />
        </div>

        <div className="admin-orders-filters" role="group" aria-label="Filter by status">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={statusFilter === option.value}
              className={cn(
                "admin-orders-filter",
                statusFilter === option.value && "admin-orders-filter-active"
              )}
              onClick={() => changeFilter(option.value)}
            >
              {option.label}
              <span className="admin-orders-filter-count">{option.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="admin-orders-table-wrap">{renderBody()}</div>

      {filteredOrders.length > PAGE_SIZE ? (
        <ListPagination
          label="Order pages"
          currentPage={currentPage}
          totalPages={totalPages}
          rangeStart={rangeStart + 1}
          rangeEnd={rangeStart + visibleOrders.length}
          totalItems={filteredOrders.length}
          onPageChange={setPage}
        />
      ) : null}

      {/* Only appears once there are more orders than one batch; search and the status filter
          apply to the batch that is loaded. */}
      <AdminPager
        page={batch}
        pageSize={ADMIN_ORDERS_PAGE_SIZE}
        total={totalOrders}
        hasNextPage={hasOlderOrders}
        hasPreviousPage={batch > 1}
        onNext={() => {
          setBatch((current) => current + 1);
          setPage(1);
        }}
        onPrevious={() => {
          setBatch((current) => Math.max(1, current - 1));
          setPage(1);
        }}
      />

      <OrderDetailSheet order={selectedOrder} onClose={() => setSelectedOrderId(null)} />
    </div>
  );
};

export default AdminOrders;
