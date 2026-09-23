import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { OrderSuccessState } from "@/types";
import { CheckCircle2 } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const OrderSuccess = () => {
  const location = useLocation();
  // There is no GET /orders/:id, so the details ride along in router state. A refresh loses them —
  // which is fine, the generic message below still confirms the order rather than erroring out.
  const state = location.state as OrderSuccessState | null;

  return (
    <div className="order-success-wrap">
      <Card className="order-success-card">
        <CardContent className="space-y-4">
          <CheckCircle2 className="order-success-icon" />
          <h1 className="order-success-title">Order placed</h1>
          <p className="order-success-subtitle">
            Thank you — we've received your order and it's being processed.
          </p>

          {state ? (
            <div className="order-success-meta">
              <p>Order ID: {state.orderId}</p>
              <p>Paid: ₹{state.totalAmount.toFixed(2)}</p>
              {state.method === "points" && state.remainingPoints !== undefined ? (
                <p>Points remaining: {state.remainingPoints}</p>
              ) : null}
            </div>
          ) : null}

          <div className="order-success-actions">
            <Button asChild className="action-button">
              <Link to="/collections">Continue shopping</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/">Back to home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderSuccess;
