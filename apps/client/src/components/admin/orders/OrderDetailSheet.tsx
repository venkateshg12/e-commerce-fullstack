import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import OrderLine from "@/components/user/orders/OrderLine";
import { useUpdateOrderStatus } from "@/hooks/order/useUpdateOrderStatus";
import {
  ORDER_STATUS_ACTION,
  ORDER_STATUS_META,
  PAYMENT_STATUS_META,
  formatOrderDate,
  formatRupees,
} from "@/lib/orderStatus";
import type { AdminOrder, OrderStatus } from "@/types";
import { ORDER_STATUS_TRANSITIONS } from "@repo/types";
import { useState } from "react";

// Moves with side effects beyond the label get an inline confirmation step.
const CONFIRM_COPY: Partial<Record<OrderStatus, (order: AdminOrder) => string>> = {
  returned: (order) =>
    `This puts the items back in stock and credits the customer ${formatRupees(order.totalAmount)} in points. It can't be undone.`,
  cancelled: () => "This order hasn't been paid. Cancelling it is final.",
};

type OrderDetailSheetProps = {
  // null closes the sheet.
  order: AdminOrder | null;
  onClose: () => void;
};

const OrderDetailSheet = ({ order, onClose }: OrderDetailSheetProps) => {
  const updateMutation = useUpdateOrderStatus();
  // The move awaiting confirmation. Confirmation lives inside the sheet on purpose: a popup
  // portalled outside it would count as a click outside and close the sheet.
  const [pendingStatus, setPendingStatus] = useState<OrderStatus | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const handleOpenChange = (open: boolean) => {
    if (open) return;
    setPendingStatus(null);
    setMessage(null);
    updateMutation.reset();
    onClose();
  };

  const applyStatus = (next: OrderStatus) => {
    if (!order) return;
    setMessage(null);
    updateMutation.mutate(
      { orderId: order._id, payload: { orderStatus: next } },
      {
        onSuccess: () => {
          setPendingStatus(null);
          setMessage({ tone: "success", text: `Order marked as ${ORDER_STATUS_META[next].label.toLowerCase()}.` });
        },
        onError: (error) => {
          setPendingStatus(null);
          setMessage({
            tone: "error",
            text: error?.message || "Couldn't update this order. Please try again.",
          });
        },
      }
    );
  };

  const requestStatus = (next: OrderStatus) => {
    if (CONFIRM_COPY[next]) {
      setMessage(null);
      setPendingStatus(next);
      return;
    }
    applyStatus(next);
  };

  const nextStatuses = order ? ORDER_STATUS_TRANSITIONS[order.orderStatus] ?? [] : [];
  const subtotal = order ? order.totalAmount + order.discountAmount : 0;

  return (
    <Sheet open={Boolean(order)} onOpenChange={handleOpenChange}>
      {/* The width override has to be inline: the primitive sets its max width as a utility,
          which outranks anything in @layer components. */}
      <SheetContent side="right" className="w-full data-[side=right]:sm:max-w-lg">
        {order ? (
          <>
            <SheetHeader>
              <SheetTitle>Order #{order.code}</SheetTitle>
              <SheetDescription>Placed on {formatOrderDate(order.createdAt, true)}</SheetDescription>
              <div className="flex flex-wrap gap-2 pt-1">
                <Badge variant={ORDER_STATUS_META[order.orderStatus].variant}>
                  {ORDER_STATUS_META[order.orderStatus].label}
                </Badge>
                <Badge variant={PAYMENT_STATUS_META[order.paymentStatus].variant}>
                  {PAYMENT_STATUS_META[order.paymentStatus].label}
                </Badge>
              </div>
            </SheetHeader>

            <div className="order-sheet-body">
              <section className="space-y-2">
                <p className="order-sheet-label">Update status</p>
                {pendingStatus ? (
                  <div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                    <p className="text-sm font-medium text-foreground">
                      {ORDER_STATUS_ACTION[pendingStatus]}?
                    </p>
                    <p className="order-sheet-muted">{CONFIRM_COPY[pendingStatus]?.(order)}</p>
                    <div className="order-sheet-actions">
                      <Button
                        type="button"
                        size="sm"
                        variant={pendingStatus === "cancelled" ? "destructive" : "default"}
                        className="order-sheet-action"
                        disabled={updateMutation.isPending}
                        onClick={() => applyStatus(pendingStatus)}
                      >
                        {updateMutation.isPending ? "Updating..." : `Yes, ${ORDER_STATUS_ACTION[pendingStatus].toLowerCase()}`}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="order-sheet-action"
                        disabled={updateMutation.isPending}
                        onClick={() => setPendingStatus(null)}
                      >
                        Keep as is
                      </Button>
                    </div>
                  </div>
                ) : nextStatuses.length ? (
                  <div className="order-sheet-actions">
                    {nextStatuses.map((next) => (
                      <Button
                        key={next}
                        type="button"
                        size="sm"
                        variant={next === "cancelled" ? "outline" : "default"}
                        className="order-sheet-action"
                        disabled={updateMutation.isPending}
                        onClick={() => requestStatus(next)}
                      >
                        {updateMutation.isPending && updateMutation.variables?.payload.orderStatus === next
                          ? "Updating..."
                          : ORDER_STATUS_ACTION[next]}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <p className="order-sheet-muted">
                    This order is {ORDER_STATUS_META[order.orderStatus].label.toLowerCase()} — its
                    status can no longer change.
                  </p>
                )}
                {order.orderStatus === "pending_payment" && !pendingStatus ? (
                  <p className="order-sheet-muted">
                    Unpaid orders can't be fulfilled — only cancelled. The customer can still pay
                    from their orders page.
                  </p>
                ) : null}
                {message ? (
                  <p
                    role="status"
                    className={
                      message.tone === "success"
                        ? "text-xs font-medium text-emerald-600 dark:text-emerald-400"
                        : "text-xs font-medium text-destructive"
                    }
                  >
                    {message.text}
                  </p>
                ) : null}
              </section>

              <section className="order-sheet-section">
                <p className="order-sheet-label">Customer</p>
                <p className="order-sheet-text">{order.customerName || "—"}</p>
                <p className="order-sheet-muted">{order.customerEmail}</p>
              </section>

              <section className="order-sheet-section">
                <p className="order-sheet-label">Delivery</p>
                <p className="order-sheet-text">{order.deliveryName}</p>
                <p className="order-sheet-muted">{order.deliveryAddress}</p>
              </section>

              <section className="order-sheet-section">
                <p className="order-sheet-label">
                  Items ({order.totalItems})
                </p>
                <div className="order-items">
                  {order.items.map((item, index) => (
                    <OrderLine
                      key={`${item.productId ?? "removed"}-${item.color ?? ""}-${item.size ?? ""}-${index}`}
                      item={item}
                    />
                  ))}
                </div>
              </section>

              <section className="order-sheet-section">
                <p className="order-sheet-label">Payment</p>
                <div className="order-summary-row">
                  <span>Subtotal</span>
                  <span>{formatRupees(subtotal)}</span>
                </div>
                {order.discountAmount > 0 ? (
                  <div className="order-summary-row">
                    <span>Discount{order.promoCode ? ` (${order.promoCode})` : ""}</span>
                    <span className="order-summary-discount">−{formatRupees(order.discountAmount)}</span>
                  </div>
                ) : null}
                <div className="order-summary-total">
                  <span>Total</span>
                  <span>{formatRupees(order.totalAmount)}</span>
                </div>
                {order.paymentId ? (
                  <p className="order-sheet-muted break-all">
                    {order.paymentId.startsWith("points_") ? "Paid with points · " : "Razorpay payment · "}
                    {order.paymentId}
                  </p>
                ) : null}
              </section>

              <section className="order-sheet-section">
                <p className="order-sheet-label">Timeline</p>
                <ul className="order-sheet-timeline">
                  <li>Placed · {formatOrderDate(order.createdAt, true)}</li>
                  {order.paidAt ? <li>Paid · {formatOrderDate(order.paidAt, true)}</li> : null}
                  {order.shippedAt ? <li>Shipped · {formatOrderDate(order.shippedAt, true)}</li> : null}
                  {order.deliveredAt ? <li>Delivered · {formatOrderDate(order.deliveredAt, true)}</li> : null}
                  {order.returnedAt ? <li>Returned · {formatOrderDate(order.returnedAt, true)}</li> : null}
                  {order.cancelledAt ? (
                    <li>
                      Cancelled{order.cancelledBy ? ` by ${order.cancelledBy}` : ""} ·{" "}
                      {formatOrderDate(order.cancelledAt, true)}
                    </li>
                  ) : null}
                </ul>
              </section>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
};

export default OrderDetailSheet;
