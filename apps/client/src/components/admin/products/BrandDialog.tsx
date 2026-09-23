import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCreateBrand } from "@/hooks/brand/useCreateBrand";
import { useDeleteBrand } from "@/hooks/brand/useDeleteBrand";
import { useUpdateBrand } from "@/hooks/brand/useUpdateBrand";
import type { Brand } from "@/types/product.types";
import { BadgeCheck } from "lucide-react";
import NameListEditor from "./NameListEditor";

type BrandDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    brands: Brand[];
};

const BrandDialog = ({ open, onOpenChange, brands }: BrandDialogProps) => {
    const createBrand = useCreateBrand();
    const updateBrand = useUpdateBrand();
    const deleteBrand = useDeleteBrand();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg font-poppins">
                <DialogHeader>
                    <DialogTitle className="font-poppins text-lg">Manage Brands</DialogTitle>
                    <DialogDescription className="font-poppins">
                        A brand can only be deleted once no product uses it.
                    </DialogDescription>
                </DialogHeader>
                {/* Keyed on open so the input and any rename in progress reset between visits. */}
                <NameListEditor
                    key={String(open)}
                    items={brands}
                    noun="brand"
                    icon={BadgeCheck}
                    emptyLabel="No brands yet. Add your first one above."
                    onCreate={(name) => createBrand.mutateAsync({ name })}
                    onRename={(brandId, name) => updateBrand.mutateAsync({ brandId, data: { name } })}
                    onDelete={(brandId) => deleteBrand.mutateAsync(brandId)}
                />
            </DialogContent>
        </Dialog>
    );
};

export default BrandDialog;
