import ListPagination from "@/components/common/ListPagination";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetActivePromos } from "@/hooks/promo/useGetActivePromos";
import { cn } from "@/lib/utils";
import { TicketPercent } from "lucide-react";
import { useState } from "react";

const PAGE_SIZE = 5;

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

type CouponsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subtotal: number;
  appliedCode: string | null;
  // Hands the code to the checkout's own apply flow, which re-validates it on the server.
  onApply: (code: string) => void;
};

const CouponsDialog = ({ open, onOpenChange, subtotal, appliedCode, onApply }: CouponsDialogProps) => {
  const { data, isPending, isError } = useGetActivePromos(open);
  const [page, setPage] = useState(1);

  const coupons = data?.data.items ?? [];
  const totalPages = Math.max(1, Math.ceil(coupons.length / PAGE_SIZE));
  // Clamped by derivation — a coupon that sells out while this is open can't strand a page.
  const currentPage = Math.min(page, totalPages);
  const rangeStart = (currentPage - 1) * PAGE_SIZE;
  const visibleCoupons = coupons.slice(rangeStart, rangeStart + PAGE_SIZE);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setPage(1);
        onOpenChange(next);
      }}
    >
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Available coupons</DialogTitle>
          <DialogDescription>
            Coupons you can use right now. Your cart total is ₹{subtotal.toFixed(2)}.
          </DialogDescription>
        </DialogHeader>

        <div className="coupons-dialog-body scrollbar-slim">
          {isPending ? (
            <div className="space-y-2" aria-hidden="true">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={`coupon-skeleton-${index}`} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : isError ? (
            <p className="coupons-dialog-empty">Couldn't load coupons. Please try again.</p>
          ) : coupons.length === 0 ? (
            <p className="coupons-dialog-empty">There are no active coupons right now.</p>
          ) : (
            <ul className="space-y-2">
              {visibleCoupons.map((coupon) => {
                const shortfall = coupon.minimumOrderValue - subtotal;
                const isEligible = shortfall <= 0;
                const isApplied = appliedCode === coupon.code;

                return (
                  <li
                    key={coupon._id}
                    className={cn("coupon-row", !isEligible && "coupon-row-ineligible")}
                  >
                    <span className="coupon-row-icon">
                      <TicketPercent className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="coupon-row-code block">{coupon.code}</span>
                      <span className="coupon-row-off block">{coupon.percentage}% off your order</span>
                      <span className="coupon-row-meta block">
                        {coupon.minimumOrderValue > 0
                          ? `On orders above ₹${coupon.minimumOrderValue.toFixed(0)}`
                          : "No minimum order"}{" "}
                        · Valid till {formatDate(coupon.endsAt)}
                      </span>
                      {!isEligible ? (
                        <span className="coupon-row-shortfall block">
                          Add ₹{shortfall.toFixed(2)} more to use this
                        </span>
                      ) : null}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant={isApplied ? "secondary" : "outline"}
                      className="coupon-row-apply"
                      disabled={!isEligible || isApplied}
                      onClick={() => onApply(coupon.code)}
                    >
                      {isApplied ? "Applied" : "Apply"}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {coupons.length > PAGE_SIZE ? (
          <ListPagination
            label="Coupon pages"
            currentPage={currentPage}
            totalPages={totalPages}
            rangeStart={rangeStart + 1}
            rangeEnd={rangeStart + visibleCoupons.length}
            totalItems={coupons.length}
            onPageChange={setPage}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default CouponsDialog;
