import { AlertPopup } from "@/components/ui/alert-popup";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import CartSteps from "@/components/user/cart/CartSteps";
import OrderSummaryCard from "@/components/user/cart/OrderSummaryCard";
import CheckoutAddressPicker from "@/components/user/checkout/CheckoutAddressPicker";
import CheckoutPayPanel from "@/components/user/checkout/CheckoutPayPanel";
import PromoCodeField from "@/components/user/checkout/PromoCodeField";
import { useGetAddresses } from "@/hooks/account/useGetAddresses";
import { useGetCart } from "@/hooks/cart/useGetCart";
import { useCreateCheckoutSession } from "@/hooks/checkout/useCreateCheckoutSession";
import { useGetPoints } from "@/hooks/checkout/useGetPoints";
import { useRazorpayPayment } from "@/hooks/checkout/useRazorpayPayment";
import { usePayWithPoints } from "@/hooks/checkout/usePayWithPoints";
import { useApplyPromo } from "@/hooks/promo/useApplyPromo";
import { getCartSubtotal, getLineKey } from "@/lib/cart";
import { loadRazorpaySdk } from "@/lib/razorpay/loadRazorpay";
import type { AlertType, Promo } from "@/types";
import { ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

type FeedbackState = {
  type: AlertType;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

const getErrorMessage = (error: unknown, fallback: string) =>
  (error as { message?: string } | null)?.message || fallback;

const Checkout = () => {
  const navigate = useNavigate();

  const { data: cartData, isPending: isCartPending } = useGetCart();
  const { data: addressesData, isLoading: isAddressesLoading } = useGetAddresses();
  const { data: pointsData } = useGetPoints();

  const createSessionMutation = useCreateCheckoutSession();
  const payWithPointsMutation = usePayWithPoints();
  const applyPromoMutation = useApplyPromo();

  // Only the user's explicit pick is stored; the effective selection below falls back to their
  // default address, so there's no effect syncing state to fetched data.
  const [chosenAddressId, setChosenAddressId] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<Promo | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const { isPaying, isConfirming, pay } = useRazorpayPayment({
    onFeedback: setFeedback,
    // Navigate before the cart cache clears, or the empty-cart guard below redirects to /cart in
    // the same tick.
    onPaid: ({ orderId, totalAmount }) =>
      navigate("/order-success", {
        replace: true,
        state: { orderId, method: "razorpay", totalAmount },
      }),
  });

  const items = cartData?.data.items ?? [];
  const totalQuantity = cartData?.data.totalQuantity ?? 0;
  const points = pointsData?.data.points ?? 0;
  const addresses = addressesData?.data ?? [];
  const defaultAddressId =
    addresses.find((address) => address.isDefault)?._id ?? addresses[0]?._id ?? "";
  const selectedAddressId = chosenAddressId || defaultAddressId;

  // Same MRP/sale split the cart page shows, so the summary reads identically across both steps.
  const totalMrp = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const subtotal = getCartSubtotal(items);
  const discountOnMrp = totalMrp - subtotal;
  // Re-checked every render, not just at apply time: the cart can change in another tab, and the
  // server would otherwise reject the whole checkout with a late 400.
  const isPromoBelowMinimum = Boolean(appliedPromo && subtotal < appliedPromo.minimumOrderValue);
  const discount =
    appliedPromo && !isPromoBelowMinimum
      ? Math.round((subtotal * appliedPromo.percentage) / 100)
      : 0;
  const total = Math.max(subtotal - discount, 0);

  // Warm the SDK while the user reads the page so the pay click doesn't wait on a network round
  // trip. Failures are ignored here — the click handler awaits the same promise and reports them.
  useEffect(() => {
    loadRazorpaySdk().catch(() => undefined);
  }, []);

  // Wait for the fetch to settle — redirecting on the first paint would bounce every visitor.
  if (!isCartPending && items.length === 0) {
    return <Navigate to="/cart" replace />;
  }

  const showError = (title: string, error: unknown, fallback: string) => {
    setFeedback({ type: "error", title, description: getErrorMessage(error, fallback) });
  };

  const handleApplyPromo = (code: string) => {
    applyPromoMutation.mutate(
      { code },
      {
        onSuccess: (response) => {
          const promo = response.data.item;
          // The apply endpoint never checks this, so if we don't, the user's first hint would be a
          // rejected checkout.
          if (subtotal < promo.minimumOrderValue) {
            setFeedback({
              type: "warning",
              title: "Promo not applicable yet",
              description: `${promo.code} needs an order of ₹${promo.minimumOrderValue.toFixed(
                2
              )}. Add ₹${(promo.minimumOrderValue - subtotal).toFixed(2)} more to use it.`,
            });
            return;
          }
          setAppliedPromo(promo);
        },
        onError: (error) => showError("Couldn't apply promo", error, "This code can't be used."),
      }
    );
  };

  // Maps the server's failure reasons for building a session to something the user can act on.
  const handleSessionError = (error: unknown) => {
    const message = getErrorMessage(error, "Could not start checkout.");

    // The cart moved under us — send the user back to fix it rather than leaving them stuck.
    if (/no longer available|Insufficient stock|Cart is empty/i.test(message)) {
      setFeedback({
        type: "warning",
        title: "Your cart needs an update",
        description: message,
        actionLabel: "Go to cart",
        onAction: () => navigate("/cart"),
      });
      return;
    }

    if (/Minimum order value/i.test(message)) {
      setAppliedPromo(null);
      setFeedback({ type: "warning", title: "Promo not applicable", description: message });
      return;
    }

    if (/Address/i.test(message)) {
      // Falls back to whichever address the refreshed list makes default.
      setChosenAddressId("");
      setFeedback({ type: "error", title: "Address unavailable", description: message });
      return;
    }

    setFeedback({ type: "error", title: "Could not start checkout", description: message });
  };

  const handlePayWithRazorpay = () => {
    if (!selectedAddressId) {
      setFeedback({
        type: "warning",
        title: "Select an address",
        description: "Choose a delivery address before paying.",
      });
      return;
    }

    void pay(
      () =>
        createSessionMutation.mutateAsync({
          addressId: selectedAddressId,
          promoCode: appliedPromo?.code,
        }),
      handleSessionError
    );
  };

  const handlePayWithPoints = () => {
    if (!selectedAddressId) {
      setFeedback({
        type: "warning",
        title: "Select an address",
        description: "Choose a delivery address before paying.",
      });
      return;
    }

    payWithPointsMutation.mutate(
      { addressId: selectedAddressId, promoCode: appliedPromo?.code },
      {
        onSuccess: (response) => {
          navigate("/order-success", {
            replace: true,
            state: {
              orderId: response.data._id,
              method: "points",
              totalAmount: total,
              remainingPoints: response.data.totalPoints,
            },
          });
        },
        onError: (error) =>
          showError("Could not place order", error, "Your order could not be placed."),
      }
    );
  };

  if (isCartPending) {
    return (
      <div className="checkout-page-wrap">
        <div className="checkout-container">
          <CartSteps current="Address" />
          <div className="checkout-layout">
            <div className="checkout-main">
              <Skeleton className="h-40 w-full rounded-2xl" />
              <Skeleton className="h-32 w-full rounded-2xl" />
            </div>
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page-wrap">
      <div className="checkout-container">
        <CartSteps current="Address" />

        <div className="checkout-layout">
          <section className="checkout-main">
            <CheckoutAddressPicker
              addresses={addresses}
              loading={isAddressesLoading}
              selectedAddressId={selectedAddressId}
              onSelect={setChosenAddressId}
            />

            <PromoCodeField
              appliedPromo={appliedPromo}
              isBelowMinimum={isPromoBelowMinimum}
              subtotal={subtotal}
              isApplying={applyPromoMutation.isPending}
              onApply={handleApplyPromo}
              onClear={() => setAppliedPromo(null)}
            />

            <Card className="checkout-section">
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="checkout-section-title">
                  <ShoppingBag className="checkout-section-icon" />
                  Your order
                </CardTitle>
                <Link to="/cart" className="checkout-review-edit">
                  Edit cart
                </Link>
              </CardHeader>
              <CardContent className="divide-y divide-border/60">
                {items.map((item) => (
                  <div key={getLineKey(item)} className="checkout-review-line">
                    <span className="checkout-review-title">{item.title}</span>
                    <span className="checkout-review-qty">×{item.quantity}</span>
                    <span className="checkout-review-price">
                      ₹{(item.finalPrice * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>

          <aside className="checkout-aside">
            <OrderSummaryCard
              totalQuantity={totalQuantity}
              totalMrp={totalMrp}
              discountOnMrp={discountOnMrp}
              couponDiscount={discount}
              total={total}
            >
              <CheckoutPayPanel
                total={total}
                points={points}
                isPaying={isPaying}
                isPayingWithPoints={payWithPointsMutation.isPending}
                isBlocked={!selectedAddressId || isPromoBelowMinimum}
                onPayWithRazorpay={handlePayWithRazorpay}
                onPayWithPoints={handlePayWithPoints}
              />
            </OrderSummaryCard>
          </aside>
        </div>
      </div>

      {feedback && (
        <AlertPopup
          isOpen
          type={feedback.type}
          title={feedback.title}
          description={feedback.description}
          actionLabel={feedback.actionLabel}
          onAction={feedback.onAction}
          isActionPending={isConfirming}
          onClose={() => setFeedback(null)}
        />
      )}
    </div>
  );
};

export default Checkout;
