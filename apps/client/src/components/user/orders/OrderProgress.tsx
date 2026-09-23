import { cn } from "@/lib/utils";
import type { OrderSummary } from "@/types";
import { Check } from "lucide-react";

const shortDate = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

type OrderProgressProps = {
  order: OrderSummary;
};

/**
 * Placed → Shipped → Delivered (→ Returned) for an order in fulfilment. Every item in an order
 * shares its status, so there is one tracker per order. Each reached step shows a check and the
 * date it happened; screen readers get "completed" / "current step" in words, so the state isn't
 * carried by colour alone. Unpaid and cancelled orders never entered fulfilment and don't get one.
 */
const OrderProgress = ({ order }: OrderProgressProps) => {
  const steps = [
    { key: "placed", label: "Placed", date: order.paidAt ?? order.createdAt },
    { key: "shipped", label: "Shipped", date: order.shippedAt },
    { key: "delivered", label: "Delivered", date: order.deliveredAt },
    ...(order.orderStatus === "returned"
      ? [{ key: "returned", label: "Returned", date: order.returnedAt }]
      : []),
  ];

  const reachedIndex = steps.findIndex((step) => step.key === order.orderStatus);

  return (
    <ol className="order-progress" aria-label="Order progress">
      {steps.map((step, index) => {
        const isReached = index <= reachedIndex;
        const isCurrent = index === reachedIndex;
        // The connector leaving this step is filled once the NEXT step has been reached.
        const isConnectorFilled = index < reachedIndex;

        return (
          <li
            key={step.key}
            className={cn(
              "order-progress-step",
              index < steps.length - 1 && "order-progress-connector",
              isConnectorFilled && "order-progress-connector-filled"
            )}
            aria-current={isCurrent ? "step" : undefined}
          >
            <span
              className={cn(
                "order-progress-dot",
                isReached && "order-progress-dot-reached",
                isCurrent && "order-progress-dot-current"
              )}
            >
              {isReached ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : index + 1}
            </span>
            <span className={cn("order-progress-label", isReached && "order-progress-label-reached")}>
              {step.label}
            </span>
            <span className="order-progress-date">
              {/* Orders shipped before shippedAt existed have no date for that step. */}
              {isReached && step.date ? shortDate(step.date) : isReached ? "" : "Pending"}
            </span>
            <span className="sr-only">
              {isCurrent ? "(current step)" : isReached ? "(completed)" : "(not yet)"}
            </span>
          </li>
        );
      })}
    </ol>
  );
};

export default OrderProgress;
