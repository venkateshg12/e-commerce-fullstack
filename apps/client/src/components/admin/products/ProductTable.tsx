import { formatDiscount } from "@/lib/price";
import { getTotalStock } from "@/lib/variants";
import { AlertPopup } from "@/components/ui/alert-popup";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeleteProduct } from "@/hooks/product/useDeleteProduct";
import type { Product, ProductImage } from "@/types/product.types";
import { Edit3, Image as ImageIcon, Trash2 } from "lucide-react";
import { useState } from "react";

type ProductTableProps = {
    products: Product[];
    onEdit: (product: Product) => void;
};

type AlertState = {
    isOpen: boolean;
    type: "error" | "warning" | "success" | "info";
    title: string;
    description: string;
    productIdToDelete?: string;
};

const getCoverImageUrl = (images?: ProductImage[]) => {
    if (!images || images.length === 0) return null;
    const cover = images.find((img) => img.isCover);
    return cover ? cover.url : images[0]?.url;
};

const ProductTable = ({ products = [], onEdit }: ProductTableProps) => {
    const [alertPopup, setAlertPopup] = useState<AlertState | null>(null);
    const deleteMutation = useDeleteProduct();

    const handleDeleteClick = (product: Product) => {
        setAlertPopup({
            isOpen: true,
            type: "warning",
            title: "Delete Product",
            description: `Are you sure you want to delete "${product.title}"? This action cannot be undone.`,
            productIdToDelete: product._id,
        });
    };

    const confirmDelete = () => {
        if (!alertPopup?.productIdToDelete) return;
        const productId = alertPopup.productIdToDelete;

        deleteMutation.mutate(productId, {
            onSuccess: () => {
                setAlertPopup({
                    isOpen: true,
                    type: "success",
                    title: "Product Deleted",
                    description: "Product has been successfully deleted.",
                });
            },
            onError: (err: any) => {
                setAlertPopup({
                    isOpen: true,
                    type: "error",
                    title: "Delete Failed",
                    description: err?.response?.data?.message || "Failed to delete product.",
                });
            },
        });
    };

    if (!products || products.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center border rounded-xl bg-card">
                <div className="p-4 rounded-full bg-muted mb-3">
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-poppins font-semibold text-lg">No Products Found</h3>
                <p className="font-poppins text-sm text-muted-foreground max-w-sm mt-1">
                    Get started by adding your first product to the store catalog.
                </p>
            </div>
        );
    }

    return (
        <div className="scrollbar-slim w-full overflow-x-auto rounded-xl border bg-card shadow-xs">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead className="w-20 pl-4">Image</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Brand</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right pr-4">Actions</TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {products.map((item) => {
                        const coverUrl = getCoverImageUrl(item.images);
                        const categoryName = item.category?.name ?? "Uncategorized";
                        const categoryLabel = item.subCategory
                            ? `${categoryName} · ${item.subCategory.name}`
                            : categoryName;

                        const isProcessingImages = item.uploadStatus === "PROCESSING" || item.uploadStatus === "PENDING";

                        return (
                            <TableRow key={item._id} className="hover:bg-muted/40 transition-colors">
                                <TableCell className="pl-4 py-3">
                                    <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-muted flex items-center justify-center">
                                        {coverUrl ? (
                                            <img
                                                src={coverUrl}
                                                alt={item.title}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : isProcessingImages ? (
                                            <Skeleton className="w-full h-full rounded-lg bg-slate-200 dark:bg-slate-800" />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center text-muted-foreground p-1" title="No images found">
                                                <ImageIcon className="w-5 h-5" />
                                            </div>
                                        )}
                                    </div>
                                </TableCell>

                                <TableCell className="font-poppins font-medium text-foreground">
                                    <div className="flex flex-col">
                                        <span>{item.title}</span>
                                        {isProcessingImages ? (
                                            <div className="inline-flex items-center gap-1.5 mt-0.5">
                                                <span className="text-[11px] font-medium  dark:text-amber-400">
                                                    Processing images
                                                </span>
                                                <span className="inline-flex items-center gap-0.5 ml-0.5">
                                                    <span className="w-1 h-1 rounded-full bg-black animate-bounce [animation-delay:-0.3s]" />
                                                    <span className="w-1 h-1 rounded-full bg-black animate-bounce [animation-delay:-0.15s]" />
                                                    <span className="w-1 h-1 rounded-full bg-black animate-bounce" />
                                                </span>
                                            </div>
                                        ) : !coverUrl ? (
                                            <span className="text-[10px] font-mono text-muted-foreground font-normal">
                                                No images found
                                            </span>
                                        ) : null}
                                    </div>
                                </TableCell>

                                <TableCell className="font-poppins text-muted-foreground">
                                    {item.brand?.name || "—"}
                                </TableCell>

                                <TableCell className="font-poppins text-muted-foreground">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                                        {categoryLabel}
                                    </span>
                                </TableCell>

                                {/* The selling price leads, the original is struck through beside it —
                                    the same way the storefront shows it, and the pair the dialog asks for. */}
                                <TableCell className="font-poppins font-semibold">
                                    ₹{(item.price - (item.price * (item.salesPercentage || 0)) / 100).toFixed(2)}
                                    {item.salesPercentage && item.salesPercentage > 0 ? (
                                        <>
                                            <span className="ml-1.5 text-xs font-normal text-muted-foreground line-through">
                                                ₹{item.price.toFixed(2)}
                                            </span>
                                            <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-mono">
                                                -{formatDiscount(item.salesPercentage)}%
                                            </span>
                                        </>
                                    ) : null}
                                </TableCell>

                                <TableCell className="font-poppins">
                                    {/* The sum of the product's variants — there is no product-level
                                        count any more, and mirroring one would only drift. */}
                                    <span className={`text-xs font-medium ${getTotalStock(item.variants) > 0 ? "text-foreground" : "text-destructive font-semibold"}`}>
                                        {getTotalStock(item.variants) > 0
                                            ? `${getTotalStock(item.variants)} in stock`
                                            : "Out of stock"}
                                    </span>
                                </TableCell>

                                <TableCell className="font-poppins">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                        item.status === "active"
                                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                            : "bg-slate-500/10 text-slate-500"
                                    }`}>
                                        {item.status === "active" ? "Active" : "Inactive"}
                                    </span>
                                </TableCell>

                                <TableCell className="text-right pr-4 py-3">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => onEdit(item)}
                                            className="h-8 w-8 p-0 cursor-pointer hover:bg-primary/10 hover:text-primary"
                                        >
                                            <Edit3 className="w-4 h-4" />
                                            <span className="sr-only">Edit</span>
                                        </Button>

                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteClick(item)}
                                            disabled={deleteMutation.isPending}
                                            className="h-8 w-8 p-0 cursor-pointer hover:bg-destructive/10 hover:text-destructive"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            <span className="sr-only">Delete</span>
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
                    onAction={alertPopup.productIdToDelete ? confirmDelete : undefined}
                    actionLabel={alertPopup.productIdToDelete ? "Delete" : "Close"}
                    isActionPending={deleteMutation.isPending}
                    autoCloseDuration={alertPopup.type === "success" ? 2000 : undefined}
                />
            )}
        </div>
    );
};

export default ProductTable;
