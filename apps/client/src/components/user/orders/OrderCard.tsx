import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ORDER_STATUS_META, formatOrderDate } from "@/lib/orderStatus";
import type { OrderSummary } from "@/types";
import { useState } from "react";
import OrderLine from "./OrderLine";
import OrderProgress from "./OrderProgress";

// Must match the TTL index on the order model (apps/backends/mongo/src/models/order.model.ts).
const CANCELLED_ORDER_TTL_MS = 12 * 60 * 60 * 1000;


// How many lines a card shows before the rest fold behind a toggle, so one big order doesn't
// dominate the page.
const VISIBLE_ITEMS = 3;

type OrderCardProps = {
  order: OrderSummary;
  onPay: (order: OrderSummary) => void;
  onCancel: (order: OrderSummary) => void;
  onReturn: (order: OrderSummary) => void;
  // True for the one card whose payment / cancellation / return is in flight — only it shows the label.
  isPaying: boolean;
  isCancelling: boolean;
  isReturning: boolean;
  // True while ANY payment or cancellation is in flight, so two can't run at once.
  isPayDisabled: boolean;
};

const OrderCard = ({
  order,
  onPay,
  onCancel,
  onReturn,
  isPaying,
  isCancelling,
  isReturning,
  isPayDisabled,
}: OrderCardProps) => {
  const [showAll, setShowAll] = useState(false);

  const status = ORDER_STATUS_META[order.orderStatus] ?? ORDER_STATUS_META.placed;

  const visibleItems = showAll ? order.items : order.items.slice(0, VISIBLE_ITEMS);
  const hiddenCount = order.items.length - VISIBLE_ITEMS;

  const subtotal = order.totalAmount + order.discountAmount;

  // Only an order abandoned at the gateway can still be paid for.
  const isPayable = order.orderStatus === "pending_payment" && order.paymentStatus === "pending";

  // Only orders that entered fulfilment get the tracker.
  const isInFulfilment = ["placed", "shipped", "delivered", "returned"].includes(order.orderStatus);

  /*
    Whether the 7-day return window is still open comes from the server with the order, so the
    button can't disagree with the endpoint — no clock reading here.
   */
  const isReturnable = order.canReturn;
  const daysLeftToReturn = order.returnDaysLeft;

  // Cancelled orders are deleted by the server 12h after cancellation (a TTL index), so say when.
  const removalTime = order.cancelledAt
    ? new Date(new Date(order.cancelledAt).getTime() + CANCELLED_ORDER_TTL_MS).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <Card className="order-card">
      <CardContent className="space-y-3">
        <div className="order-card-head">
          <div>
            <p className="order-card-code">Order #{order.code}</p>
            <p className="order-card-date">Placed on {formatOrderDate(order.createdAt)}</p>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>

        {isInFulfilment ? <OrderProgress order={order} /> : null}

        <div className="order-items">
          {visibleItems.map((item, index) => (
            <OrderLine key={`${item.productId ?? "removed"}-${item.color ?? ""}-${item.size ?? ""}-${index}`} item={item} />
          ))}
        </div>

        {hiddenCount > 0 ? (
          <Button
            type="button"
            variant="ghost"
            className="order-items-toggle"
            onClick={() => setShowAll((current) => !current)}
          >
            {showAll ? "Show fewer items" : `View all ${order.items.length} items`}
          </Button>
        ) : null}

        <div className="order-card-footer">
          <div>
            <p className="order-card-address-label">Delivering to</p>
            <p className="order-card-address">
              <span className="font-medium text-foreground">{order.deliveryName}</span>
              <br />
              {order.deliveryAddress}
            </p>
          </div>

          <div className="order-card-summary">
            <div className="order-summary-row">
              <span>Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            {order.discountAmount > 0 ? (
              <div className="order-summary-row">
                <span>Discount{order.promoCode ? ` (${order.promoCode})` : ""}</span>
                <span className="order-summary-discount">−₹{order.discountAmount.toFixed(2)}</span>
              </div>
            ) : null}
            <div className="order-summary-total">
              <span>Total</span>
              <span>₹{order.totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {isReturnable ? (
          <div className="order-return-strip">
            <div>
              <p className="order-return-title">Not what you expected?</p>
              <p className="order-return-note">
                You can return this order for {daysLeftToReturn} more {daysLeftToReturn === 1 ? "day" : "days"}.
                We'll add ₹{order.totalAmount.toFixed(2)} to your points, which you can spend at checkout.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="order-return-button"
              disabled={isPayDisabled}
              onClick={() => onReturn(order)}
            >
              {isReturning ? "Returning..." : "Return order"}
            </Button>
          </div>
        ) : null}

        {isPayable ? (
          <div className="order-pay-strip">
            <div>
              <p className="order-pay-title">Payment not completed</p>
              {/* Leaving it alone is the "hold" option — it stays payable until they decide. */}
              <p className="order-pay-note">
                Pay now to place this order, or cancel it. It stays here until you decide.
              </p>
            </div>
            <div className="order-pay-actions">
              <Button
                type="button"
                variant="outline"
                className="order-pay-cancel"
                disabled={isPayDisabled}
                onClick={() => onCancel(order)}
              >
                {isCancelling ? "Cancelling..." : "Cancel order"}
              </Button>
              <Button
                type="button"
                className="order-pay-button"
                disabled={isPayDisabled}
                onClick={() => onPay(order)}
              >
                {isPaying ? "Processing..." : `Pay ₹${order.totalAmount.toFixed(2)} now`}
              </Button>
            </div>
          </div>
        ) : order.orderStatus === "cancelled" && order.cancelledAt ? (
          <p className="order-card-timeline">
            Cancelled on {formatOrderDate(order.cancelledAt)}. This order will be removed from your
            list on {removalTime}.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default OrderCard;
