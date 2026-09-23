import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AdminBanner } from "@/types/settings.types";

function formatDateTime(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  return isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

type BannerTableProps = {
  items: AdminBanner[];
  onDelete: (bannerId: string) => void;
  // The one row whose removal is in flight, so only it shows the pending label.
  deletingBannerId: string | null;
};

function BannerTable({ items, onDelete, deletingBannerId }: BannerTableProps) {
  return (
    <div className="table-wrap-class">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Preview</TableHead>
            <TableHead>Public ID</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead className="w-24 text-right">Remove</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {items.map((item) => (
            <TableRow key={item._id}>
              <TableCell>
                <div className="preview-wrap-class">
                  <img
                    src={item.imageUrl}
                    alt="banner"
                    className="image-class"
                  />
                </div>
              </TableCell>

              <TableCell>
                <p className="public-id-text-class">{item.imagePublicId}</p>
              </TableCell>
              <TableCell>
                <p>{formatDateTime(item.createdAt)}</p>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="banner-delete-button"
                  disabled={deletingBannerId === item._id}
                  aria-label="Remove this banner from the storefront"
                  onClick={() => onDelete(item._id)}
                >
                  <Trash2 className="size-4" />
                  {deletingBannerId === item._id ? "Removing..." : "Remove"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export { BannerTable };
export default BannerTable;
