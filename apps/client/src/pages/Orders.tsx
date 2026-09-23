import ListPagination from "@/components/common/ListPagination";
import { AlertPopup } from "@/components/ui/alert-popup";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import OrderCard from "@/components/user/orders/OrderCard";
import { useResumeCheckoutSession } from "@/hooks/checkout/useResumeCheckoutSession";
import { useRazorpayPayment, type PaymentFeedback } from "@/hooks/checkout/useRazorpayPayment";
import { useCancelOrder } from "@/hooks/order/useCancelOrder";
import { useReturnOrder } from "@/hooks/order/useReturnOrder";
import { useGetOrders } from "@/hooks/order/useGetOrders";
import queryClient from "@/lib/queryClient";
import { ORDER_STATUS_META } from "@/lib/orderStatus";
import { cn } from "@/lib/utils";
import type { OrderStatus, OrderSummary } from "@/types";
import { ALLOWED_ORDER_STATUSES } from "@repo/types";
import { Search } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const PAGE_SIZE = 5;
// Delivered orders pile up; by default only the most recent few are listed.
const VISIBLE_DELIVERED = 5;

type StatusFilter = "all" | OrderStatus;

const Orders = () => {
  const navigate = useNavigate();
  const { data, isPending, isError } = useGetOrders();
  const resumeMutation = useResumeCheckoutSession();
  const cancelMutation = useCancelOrder();
  const returnMutation = useReturnOrder();

  const [feedback, setFeedback] = useState<PaymentFeedback | null>(null);
  // Which card's payment is in flight, so only that button shows the pending label.
  const [payingOrderId, setPayingOrderId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showOlderDelivered, setShowOlderDelivered] = useState(false);
  const [page, setPage] = useState(1);

  const { isPaying, isConfirming, pay } = useRazorpayPayment({
    onFeedback: setFeedback,
    onPaid: ({ orderId, totalAmount }) =>
      navigate("/order-success", {
        replace: true,
        state: { orderId, method: "razorpay", totalAmount },
      }),
    cancelledDescription:
      "Nothing was charged. You can complete this payment any time from My Orders.",
  });

  const orders = data?.data.items ?? [];

  // 1. Delivered cap. The API sorts newest first, so the first N delivered orders are the latest.
  const deliveredOrders = orders.filter((order) => order.orderStatus === "delivered");
  const olderDeliveredIds = new Set(deliveredOrders.slice(VISIBLE_DELIVERED).map((order) => order._id));
  const listableOrders = showOlderDelivered
    ? orders
    : orders.filter((order) => !olderDeliveredIds.has(order._id));

  // 2. Status chips (with counts over what's listable) and search over order # and products.
  const countByStatus = listableOrders.reduce<Record<string, number>>((counts, order) => {
    counts[order.orderStatus] = (counts[order.orderStatus] ?? 0) + 1;
    return counts;
  }, {});
  const filterOptions: Array<{ value: StatusFilter; label: string; count: number }> = [
    { value: "all", label: "All", count: listableOrders.length },
    // Only the statuses this customer actually has — a row of zero chips is noise.
    ...ALLOWED_ORDER_STATUSES.filter((status) => countByStatus[status]).map((status) => ({
      value: status,
      label: ORDER_STATUS_META[status].label,
      count: countByStatus[status],
    })),
  ];

  const query = search.trim().toLowerCase();
  const filteredOrders = listableOrders.filter((order) => {
    if (statusFilter !== "all" && order.orderStatus !== statusFilter) return false;
    if (!query) return true;
    return (
      order.code.toLowerCase().includes(query) ||
      order.items.some(
        (item) =>
          item.title?.toLowerCase().includes(query) || item.brand.toLowerCase().includes(query)
      )
    );
  });

  // 3. Pagination, clamped by derivation so a shrinking list can't strand an empty page.
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const rangeStart = (currentPage - 1) * PAGE_SIZE;
  const visibleOrders = filteredOrders.slice(rangeStart, rangeStart + PAGE_SIZE);

  // Filters reset to page 1 in their own handlers rather than through an effect.
  const changeFilter = (next: StatusFilter) => {
    setStatusFilter(next);
    setPage(1);
  };

  const cancelOrder = (order: OrderSummary) => {
    setPayingOrderId(order._id);
    cancelMutation.mutate(order._id, {
      onSuccess: () =>
        setFeedback({
          type: "success",
          title: "Order cancelled",
          description: `Order #${order.code} has been cancelled. Nothing was charged.`,
        }),
      // Covers "we already received a payment" and "it was just paid" — the server's message
      // says which, and the list refetches either way.
      onError: (error) =>
        setFeedback({
          type: "error",
          title: "Couldn't cancel this order",
          description: error?.message || "Something went wrong. Please try again.",
        }),
      onSettled: () => setPayingOrderId(""),
    });
  };

  const returnOrder = (order: OrderSummary) => {
    setPayingOrderId(order._id);
    returnMutation.mutate(order._id, {
      onSuccess: () =>
        setFeedback({
          type: "success",
          title: "Return accepted",
          description: `₹${order.totalAmount.toFixed(2)} has been added to your points. You can spend them at checkout.`,
        }),
      // Covers the window having closed and the items' colour/size no longer existing — the
      // server's message says which, and the list refetches either way.
      onError: (error) =>
        setFeedback({
          type: "error",
          title: "Couldn't return this order",
          description: error?.message || "Something went wrong. Please try again.",
        }),
      onSettled: () => setPayingOrderId(""),
    });
  };

  // Ask first: a return can't be undone, and the money comes back as points rather than to the card.
  const promptReturn = (order: OrderSummary) => {
    setFeedback({
      type: "warning",
      title: `Return order #${order.code}?`,
      description: `We'll add ₹${order.totalAmount.toFixed(2)} to your points balance, which you can spend at checkout. This can't be undone.`,
      actionLabel: "Return order",
      onAction: () => returnOrder(order),
    });
  };

  // Ask first: cancelling is final, while leaving the order alone keeps it payable.
  const promptCancel = (order: OrderSummary) => {
    setFeedback({
      type: "warning",
      title: `Cancel order #${order.code}?`,
      description:
        "This order hasn't been paid, so nothing will be charged. Once cancelled it can't be paid for — you'd need to order again.",
      actionLabel: "Cancel order",
      onAction: () => cancelOrder(order),
    });
  };

  const handlePay = (order: OrderSummary) => {
    setPayingOrderId(order._id);

    void pay(
      () => resumeMutation.mutateAsync({ orderId: order._id }),
      (error) => {
        // The server re-checks stock, the promo and whether the order is still payable, so what
        // this card showed may be stale (already paid, an item sold out) — refetch alongside.
        queryClient.invalidateQueries({ queryKey: ["orders"] });
        setFeedback({
          type: "error",
          title: "Can't complete this payment",
          description:
            (error as { message?: string } | null)?.message ||
            "Something went wrong. Please try again.",
        });
      }
    );
  };

  const renderContent = () => {
    if (isPending) {
      return (
        <div className="orders-list" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={`order-skeleton-${index}`} className="h-64 w-full rounded-lg" />
          ))}
        </div>
      );
    }

    if (isError) {
      return (
        <Card className="empty-card">
          <CardContent className="empty-card-content">
            <p className="empty-title">Couldn't load your orders</p>
            <p className="text-sm text-muted-foreground">Please refresh and try again.</p>
          </CardContent>
        </Card>
      );
    }

    if (orders.length === 0) {
      return (
        <Card className="empty-card">
          <CardContent className="empty-card-content">
            <p className="empty-title">No orders yet</p>
            <Button asChild className="action-button">
              <Link to="/collections">Browse collections</Link>
            </Button>
          </CardContent>
        </Card>
      );
    }

    if (filteredOrders.length === 0) {
      return (
        <Card className="empty-card">
          <CardContent className="empty-card-content">
            <p className="empty-title">No orders match these filters</p>
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={() => {
                setSearch("");
                changeFilter("all");
              }}
            >
              Clear filters
            </Button>
          </CardContent>
        </Card>
      );
    }

    // The API already sorts newest first.
    return (
      <div className="orders-list">
        {visibleOrders.map((order) => (
          <OrderCard
            key={order._id}
            order={order}
            onPay={handlePay}
            onCancel={promptCancel}
            onReturn={promptReturn}
            isPaying={isPaying && payingOrderId === order._id}
            isCancelling={cancelMutation.isPending && payingOrderId === order._id}
            isReturning={returnMutation.isPending && payingOrderId === order._id}
            isPayDisabled={isPaying || cancelMutation.isPending || returnMutation.isPending}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="orders-page-wrap">
      <div className="orders-container">
        <h1 className="orders-heading">My Orders</h1>

        {orders.length > 0 ? (
          <div className="orders-toolbar">
            <div className="admin-orders-search">
              <Search className="admin-orders-search-icon" />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search by order # or product"
                className="pl-9"
                aria-label="Search your orders"
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
        ) : null}

        {renderContent()}

        {filteredOrders.length > PAGE_SIZE ? (
          <div className="mt-4">
            <ListPagination
              label="Order pages"
              currentPage={currentPage}
              totalPages={totalPages}
              rangeStart={rangeStart + 1}
              rangeEnd={rangeStart + visibleOrders.length}
              totalItems={filteredOrders.length}
              onPageChange={setPage}
            />
          </div>
        ) : null}

        {olderDeliveredIds.size > 0 ? (
          <button
            type="button"
            className="orders-older-toggle"
            onClick={() => {
              setShowOlderDelivered((current) => !current);
              setPage(1);
            }}
          >
            {showOlderDelivered
              ? "Hide older delivered orders"
              : `Show ${olderDeliveredIds.size} older delivered ${olderDeliveredIds.size === 1 ? "order" : "orders"}`}
          </button>
        ) : null}
      </div>

      {feedback && (
        <AlertPopup
          isOpen
          type={feedback.type}
          title={feedback.title}
          description={feedback.description}
          actionLabel={feedback.actionLabel}
          onAction={feedback.onAction}
          isActionPending={isConfirming || cancelMutation.isPending}
          onClose={() => setFeedback(null)}
        />
      )}
    </div>
  );
};

export default Orders;
