import { AlertPopup } from "@/components/ui/alert-popup";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Promo } from "@/types/promo.types";
import { Check, Copy, Edit3, Tag, Trash2 } from "lucide-react";
import { useState } from "react";

type PromoTableProps = {
  promos?: Promo[];
  loading?: boolean;
  onEdit: (promo: Promo) => void;
  onDelete: (promoId: string) => Promise<void> | void;
  deletingId?: string;
};

type AlertState = {
  isOpen: boolean;
  type: "error" | "warning" | "success" | "info";
  title: string;
  description: string;
  promoIdToDelete?: string;
};

const PromoTable = ({
  promos = [],
  loading = false,
  onEdit,
  onDelete,
  deletingId = "",
}: PromoTableProps) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [alertPopup, setAlertPopup] = useState<AlertState | null>(null);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleDeleteClick = (promo: Promo) => {
    setAlertPopup({
      isOpen: true,
      type: "warning",
      title: "Delete Promo",
      description: `Are you sure you want to delete promo "${promo.code}"? This action cannot be undone.`,
      promoIdToDelete: promo._id,
    });
  };

  const confirmDelete = async () => {
    if (!alertPopup?.promoIdToDelete) return;
    const promoId = alertPopup.promoIdToDelete;

    try {
      await onDelete(promoId);
      setAlertPopup({
        isOpen: true,
        type: "success",
        title: "Promo Deleted",
        description: "Promo code has been successfully deleted.",
      });
    } catch (err: any) {
      setAlertPopup({
        isOpen: true,
        type: "error",
        title: "Delete Failed",
        description:
          err?.response?.data?.message ||
          err?.message ||
          "Failed to delete promo.",
      });
    }
  };

  const getPromoStatus = (promo: Promo) => {
    const now = new Date();
    const start = new Date(promo.startsAt);
    const end = new Date(promo.endsAt);

    if (now < start) {
      return {
        label: "Upcoming",
        className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      };
    }
    if (now > end) {
      return {
        label: "Expired",
        className: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
      };
    }
    if (promo.count <= 0) {
      return {
        label: "Depleted",
        className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      };
    }
    return {
      label: "Active",
      className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    };
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="w-full overflow-hidden rounded-xl border bg-card p-4 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="grid grid-cols-12 gap-3 items-center px-4 py-2"
          >
            <Skeleton className="col-span-3 h-8 rounded-md" />
            <Skeleton className="col-span-1 h-5 rounded-md" />
            <Skeleton className="col-span-2 h-5 rounded-md" />
            <Skeleton className="col-span-1 h-5 rounded-md" />
            <Skeleton className="col-span-3 h-5 rounded-md" />
            <Skeleton className="col-span-1 h-5 rounded-full" />
            <Skeleton className="col-span-1 h-8 rounded-md" />
          </div>
        ))}
      </div>
    );
  }

  if (!promos || promos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border rounded-xl bg-card">
        <div className="p-4 rounded-full bg-muted/60 mb-3">
          <Tag className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-poppins font-semibold text-lg text-foreground">
          No Promos Found
        </h3>
        <p className="font-poppins text-sm text-muted-foreground max-w-sm mt-1">
          Create your first promotional discount code to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="scrollbar-slim w-full overflow-x-auto rounded-xl border bg-card shadow-xs">
      <Table className="min-w-225">
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-50 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Promo Code
            </TableHead>

            <TableHead className="w-30 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Discount
            </TableHead>

            <TableHead className="w-30 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Usage Limit
            </TableHead>

            <TableHead className="w-30 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Min. Order
            </TableHead>

            <TableHead className="w-55 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Validity
            </TableHead>

            <TableHead className="w-30 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Status
            </TableHead>

            <TableHead className="w-30 px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody className="divide-y divide-border">
          {promos.map((promo) => {
            const status = getPromoStatus(promo);
            const isDeleting = deletingId === promo._id;

            return (
              <TableRow
                key={promo._id}
                className="text-sm transition-colors hover:bg-muted/30"
              >
                <TableCell className="px-5 py-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md border bg-muted/80 px-2.5 py-1 font-mono text-xs font-bold tracking-wider text-foreground">
                      {promo.code}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleCopy(promo.code)}
                      className="cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      title="Copy code"
                    >
                      {copiedCode === promo.code ? (
                        <Check className="size-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </button>
                  </div>
                </TableCell>

                <TableCell className="px-4 py-2 text-center font-semibold text-foreground">
                  {promo.percentage}% OFF
                </TableCell>

                <TableCell className="px-4 py-2 text-center text-muted-foreground">
                  {promo.count} uses
                </TableCell>

                <TableCell className="px-4 py-2 text-center text-muted-foreground">
                  ₹{promo.minimumOrderValue ?? 0}
                </TableCell>

                <TableCell className="px-4 py-2 text-xs">
                  <div className="flex items-center gap-1 whitespace-nowrap justify-center">
                    <span className="font-medium text-foreground">
                      {formatDate(promo.startsAt)}
                    </span>

                    <span className="text-muted-foreground/60">-</span>

                    <span className="font-medium text-foreground">
                      {formatDate(promo.endsAt)}
                    </span>
                  </div>
                </TableCell>

                <TableCell className="px-4 py-2 text-center">
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${status.className}`}
                  >
                    {status.label}
                  </span>
                </TableCell>

                <TableCell className="px-5 py-2">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onEdit(promo)}
                      className="size-8 cursor-pointer text-muted-foreground hover:bg-muted hover:text-foreground"
                      title="Edit Promo"
                    >
                      <Edit3 className="size-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDeleteClick(promo)}
                      disabled={isDeleting}
                      className="size-8 cursor-pointer text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      title="Delete Promo"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {alertPopup && (
        <AlertPopup
          isOpen={alertPopup.isOpen}
          type={alertPopup.type}
          title={alertPopup.title}
          description={alertPopup.description}
          onClose={() => setAlertPopup(null)}
          onAction={alertPopup.promoIdToDelete ? confirmDelete : undefined}
          actionLabel={alertPopup.promoIdToDelete ? "Delete" : "Close"}
        />
      )}
    </div>
  );
};

export default PromoTable;
