import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReactNode } from "react";

type OrderSummaryCardProps = {
  totalQuantity: number;
  // Sum of list prices — what the items would cost with no sale applied.
  totalMrp: number;
  // What the per-product sale percentages already knocked off.
  discountOnMrp: number;
  // From an applied promo code; 0 on the cart page, where no promo has been entered yet.
  couponDiscount?: number;
  // Rendered in the coupon row when nothing is applied — a link to the checkout step on /cart.
  couponSlot?: ReactNode;
  total: number;
  // The page supplies its own action buttons.
  children: ReactNode;
};

const OrderSummaryCard = ({
  totalQuantity,
  totalMrp,
  discountOnMrp,
  couponDiscount = 0,
  couponSlot,
  total,
  children,
}: OrderSummaryCardProps) => {
  return (
    <Card className="cart-summary-card">
      <CardHeader>
        <CardTitle className="cart-summary-title">
          Price details ({totalQuantity} {totalQuantity === 1 ? "item" : "items"})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="cart-summary-row">
          <span className="cart-summary-label">Total MRP</span>
          <span className="cart-summary-value">₹{totalMrp.toFixed(2)}</span>
        </div>

        {discountOnMrp > 0 ? (
          <div className="cart-summary-row">
            <span className="cart-summary-label">Discount on MRP</span>
            <span className="cart-summary-discount">−₹{discountOnMrp.toFixed(2)}</span>
          </div>
        ) : null}

        {couponDiscount > 0 || couponSlot ? (
          <div className="cart-summary-row">
            <span className="cart-summary-label">Coupon discount</span>
            {couponDiscount > 0 ? (
              <span className="cart-summary-discount">−₹{couponDiscount.toFixed(2)}</span>
            ) : (
              couponSlot
            )}
          </div>
        ) : null}

        <div className="cart-summary-total-row">
          <span>Total amount</span>
          <span>₹{total.toFixed(2)}</span>
        </div>

        <div className="cart-summary-actions">{children}</div>
      </CardContent>
    </Card>
  );
};

export default OrderSummaryCard;
