import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

type ListPaginationProps = {
  // What the pages are of, for screen readers: "Cart pages", "Order pages".
  label: string;
  currentPage: number;
  totalPages: number;
  // First and last visible row numbers, for the "Showing 1–5 of 12" hint.
  rangeStart: number;
  rangeEnd: number;
  totalItems: number;
  onPageChange: (page: number) => void;
};

const ListPagination = ({
  label,
  currentPage,
  totalPages,
  rangeStart,
  rangeEnd,
  totalItems,
  onPageChange,
}: ListPaginationProps) => {
  return (
    <nav className="list-pagination" aria-label={label}>
      <p className="list-pagination-info">
        Showing {rangeStart}–{rangeEnd} of {totalItems}
      </p>

      <div className="list-pagination-controls">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="list-pagination-button"
          aria-label="Previous page"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Prev
        </Button>

        {/* No ellipsis: the lists this pages (a cart, an admin's orders) realistically top out at a
            handful of pages, and collapsing three of them behind a "…" would be noise. */}
        {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
          <Button
            key={page}
            type="button"
            size="icon-sm"
            variant={page === currentPage ? "default" : "ghost"}
            className="list-pagination-page"
            aria-label={`Page ${page}`}
            aria-current={page === currentPage ? "page" : undefined}
            onClick={() => onPageChange(page)}
          >
            {page}
          </Button>
        ))}

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="list-pagination-button"
          aria-label="Next page"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </nav>
  );
};

export default ListPagination;
