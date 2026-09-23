import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Promo } from "@/types";
import { TicketPercent, X } from "lucide-react";
import { useState } from "react";
import CouponsDialog from "./CouponsDialog";

type PromoCodeFieldProps = {
  appliedPromo: Promo | null;
  // True when the cart dropped below the applied promo's minimum after it was applied.
  isBelowMinimum: boolean;
  subtotal: number;
  isApplying: boolean;
  onApply: (code: string) => void;
  onClear: () => void;
};

const PromoCodeField = ({
  appliedPromo,
  isBelowMinimum,
  subtotal,
  isApplying,
  onApply,
  onClear,
}: PromoCodeFieldProps) => {
  const [code, setCode] = useState("");
  const [isCouponsOpen, setIsCouponsOpen] = useState(false);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!code.trim()) return;
    onApply(code.trim().toUpperCase());
    setCode("");
  };

  return (
    <Card className="checkout-section">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="checkout-section-title">
          <TicketPercent className="checkout-section-icon" />
          Promo code
        </CardTitle>
        <button
          type="button"
          className="checkout-view-coupons"
          onClick={() => setIsCouponsOpen(true)}
        >
          View coupons
        </button>
      </CardHeader>
      <CardContent className="space-y-2">
        {appliedPromo ? (
          <>
            <div className="checkout-promo-applied">
              <span className="checkout-promo-applied-text">
                <Badge variant="secondary">{appliedPromo.code}</Badge>
                {appliedPromo.percentage}% off
              </span>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="Remove promo code"
                className="cursor-pointer"
                onClick={onClear}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            {isBelowMinimum ? (
              <p className="checkout-promo-warning">
                This code needs a ₹{appliedPromo.minimumOrderValue.toFixed(2)} order — add ₹
                {(appliedPromo.minimumOrderValue - subtotal).toFixed(2)} more or remove it to
                continue.
              </p>
            ) : null}
          </>
        ) : (
          <form className="checkout-promo-form" onSubmit={handleSubmit}>
            <Input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Enter code"
              className="checkout-promo-input"
              disabled={isApplying}
            />
            <Button type="submit" className="cursor-pointer" disabled={isApplying || !code.trim()}>
              {isApplying ? "Applying..." : "Apply"}
            </Button>
          </form>
        )}
      </CardContent>

      <CouponsDialog
        open={isCouponsOpen}
        onOpenChange={setIsCouponsOpen}
        subtotal={subtotal}
        appliedCode={appliedPromo?.code ?? null}
        // Goes through the same apply flow as typing the code, so it's validated identically.
        onApply={(couponCode) => {
          onApply(couponCode);
          setIsCouponsOpen(false);
        }}
      />
    </Card>
  );
};

export default PromoCodeField;
