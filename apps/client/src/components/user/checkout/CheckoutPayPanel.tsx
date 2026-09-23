import { Button } from "@/components/ui/button";
import { LoadingDots } from "@/components/ui/loading-dots";

type CheckoutPayPanelProps = {
  total: number;
  points: number;
  isPaying: boolean;
  isPayingWithPoints: boolean;
  // Address missing, or the applied promo no longer clears its minimum.
  isBlocked: boolean;
  onPayWithRazorpay: () => void;
  onPayWithPoints: () => void;
};

const CheckoutPayPanel = ({
  total,
  points,
  isPaying,
  isPayingWithPoints,
  isBlocked,
  onPayWithRazorpay,
  onPayWithPoints,
}: CheckoutPayPanelProps) => {
  const isBusy = isPaying || isPayingWithPoints;
  const hasEnoughPoints = points >= total;

  return (
    <>
      <Button
        type="button"
        className="checkout-pay-primary"
        disabled={isBlocked || isBusy}
        onClick={onPayWithRazorpay}
      >
        {isPaying ? <LoadingDots /> : `Pay ₹${total.toFixed(2)}`}
      </Button>

      <Button
        type="button"
        variant="outline"
        className="checkout-pay-points"
        disabled={isBlocked || isBusy || !hasEnoughPoints}
        onClick={onPayWithPoints}
      >
        {isPayingWithPoints ? <LoadingDots /> : "Pay with points"}
      </Button>

      {hasEnoughPoints ? (
        <p className="checkout-points-balance">
          You have {points} points (1 point = ₹1)
        </p>
      ) : (
        <p className="checkout-points-short">
          You need {Math.ceil(total - points)} more points to pay this way
        </p>
      )}

      <p className="checkout-pay-note">Payments are processed securely by Razorpay.</p>
    </>
  );
};

export default CheckoutPayPanel;
