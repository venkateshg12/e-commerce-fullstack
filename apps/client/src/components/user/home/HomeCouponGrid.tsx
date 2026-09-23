import { Button } from "@/components/ui/button";
import type { HomeCoupon } from "@/types";
import { Check, Copy, TicketPercent } from "lucide-react";
import { useState } from "react";

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

type HomeCouponGridProps = {
  coupons: HomeCoupon[];
};

const HomeCouponGrid = ({ coupons }: HomeCouponGridProps) => {
  // Which code was just copied, so only that card flips to "Copied".
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (code: string) => {
    navigator.clipboard
      .writeText(code)
      .then(() => {
        setCopiedCode(code);
        setTimeout(() => setCopiedCode((current) => (current === code ? null : current)), 2000);
      })
      // Clipboard access can be refused (insecure context, permissions); the code stays on
      // screen to type by hand, so there's nothing useful to report.
      .catch(() => undefined);
  };

  return (
    <section>
      <div className="home-section-head">
        <div>
          <p className="home-section-eyebrow">Offers</p>
          <h2 className="home-section-title">Live coupons</h2>
        </div>
      </div>

      <div className="home-coupon-grid">
        {coupons.map((coupon) => (
          <div key={coupon._id} className="home-coupon-card">
            <div className="home-coupon-head">
              <span className="home-coupon-off">{coupon.percentage}% OFF</span>
              <span className="home-coupon-icon">
                <TicketPercent className="h-5 w-5" />
              </span>
            </div>

            <div>
              <p className="home-coupon-code-label">Use code</p>
              <p className="home-coupon-code">{coupon.code}</p>
            </div>

            <div className="home-coupon-meta">
              {coupon.minimumOrderValue > 0 ? (
                <p>On orders above ₹{coupon.minimumOrderValue.toFixed(0)}</p>
              ) : (
                <p>No minimum order</p>
              )}
              <p>Valid till {formatDate(coupon.endsAt)}</p>
            </div>

            <Button
              type="button"
              variant="outline"
              className="home-coupon-copy"
              onClick={() => handleCopy(coupon.code)}
            >
              {copiedCode === coupon.code ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy code
                </>
              )}
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
};

export default HomeCouponGrid;
