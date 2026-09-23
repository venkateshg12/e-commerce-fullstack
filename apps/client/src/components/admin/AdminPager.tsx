import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type AdminPagerProps = {
  page: number;
  /** Rows on the current page, for the "showing x–y of z" line. */
  pageSize: number;
  total: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onNext: () => void;
  onPrevious: () => void;
};

/*
  Admin lists are served a page at a time — they used to load every row, with each order's or
  product's references populated. Shared by the products and orders tables so both read the same.
*/
const AdminPager = ({
  page,
  pageSize,
  total,
  hasNextPage,
  hasPreviousPage,
  onNext,
  onPrevious,
}: AdminPagerProps) => {
  if (!hasNextPage && !hasPreviousPage) return null;

  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = (page - 1) * pageSize + pageSize;

  return (
    <div className="admin-pager">
      <p className="admin-pager-count">
        Showing {first}–{Math.min(last, total)} of {total}
      </p>
      <div className="admin-pager-actions">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrevious}
          disabled={!hasPreviousPage}
          className="cursor-pointer"
        >
          <ChevronLeft className="size-4" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={!hasNextPage}
          className="cursor-pointer"
        >
          Next
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
};

export default AdminPager;
