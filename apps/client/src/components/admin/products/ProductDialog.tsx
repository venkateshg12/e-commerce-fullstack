import { AlertPopup } from "@/components/ui/alert-popup";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BRAND_OPTIONS } from "@/constants/constant";
import { PRODUCT_TYPES, type ProductType } from "@repo/types";
import useProductForm from "@/hooks/product/useProductForm";
import type { Category, Product } from "@/types/product.types";
import { Loader2 } from "lucide-react";
import ColorPicker from "./ColorPicker";
import ImagePicker from "./ImagePicker";
import SizeSelector from "./SizeSelector";


type ProductDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    categories: Category[];
    product: Product | null;
    onSaved: () => Promise<void>;
};

const ProductDialog = ({ open, onOpenChange, categories, product, onSaved }: ProductDialogProps) => {
    const {
        form,
        alertPopup,
        setAlertPopup,
        isPending,
        updateFormField,
        updateNumberField,
        addColor,
        removeColor,
        toggleSizes,
        localFiles,
        setLocalFiles,
        submit,
    } = useProductForm({
        open,
        product,
        onSaved,
        onClose: () => onOpenChange(false),
    });

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="w-[calc(100%-2rem)] sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto font-poppins">
                    <DialogHeader>
                        <DialogTitle className="font-poppins text-lg font-semibold">
                            {product ? "Edit Product" : "Add Product"}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="font-poppins">Title</Label>
                            <Input
                                placeholder="Product Title"
                                value={form.title}
                                onChange={(e) => updateFormField("title", e.target.value)}
                                className="font-poppins"
                            />
                        </div>
                        <div className="flex items-center gap-3 mt-auto h-9">
                            <Label className="font-poppins shrink-0">Brand</Label>
                            <Select
                                value={form.brand}
                                onValueChange={(val) => updateFormField("brand", val)}
                            >
                                <SelectTrigger className="font-poppins flex-1">
                                    <SelectValue placeholder="Select Brand" />
                                </SelectTrigger>
                                <SelectContent>
                                    {BRAND_OPTIONS.map((brand) => (
                                        <SelectItem key={brand} value={brand} className="font-poppins">
                                            {brand}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="font-poppins">Description</Label>
                        <Textarea
                            rows={4}
                            placeholder="Description"
                            value={form.description}
                            onChange={(e) => updateFormField("description", e.target.value)}
                            className="font-poppins"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 h-9">
                            <Label className="font-poppins shrink-0">Category</Label>
                            <Select
                                value={form.category}
                                onValueChange={(val) => updateFormField("category", val)}
                            >
                                <SelectTrigger className="font-poppins flex-1">
                                    <SelectValue placeholder="Select Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((cat) => (
                                        <SelectItem key={cat._id} value={cat._id} className="font-poppins">
                                            {cat.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-3 h-9">
                            <Label className="font-poppins shrink-0">Type</Label>
                            <Select
                                value={form.productType}
                                onValueChange={(val) => updateFormField("productType", val as ProductType)}
                            >
                                <SelectTrigger className="font-poppins flex-1">
                                    <SelectValue placeholder="Select Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {PRODUCT_TYPES.map((type) => (
                                        <SelectItem key={type} value={type} className="font-poppins">
                                            {type}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 h-9">
                            <Label className="font-poppins shrink-0">Status</Label>
                            <RadioGroup
                                value={form.status}
                                onValueChange={(val: "active" | "inactive") => updateFormField("status", val)}
                                className="flex flex-row items-center gap-6 rounded-md border border-input bg-background px-3 h-9 w-fit"
                            >
                                <div className="flex items-center space-x-2 cursor-pointer">
                                    <RadioGroupItem value="active" id="product-status-active" />
                                    <Label htmlFor="product-status-active" className="cursor-pointer font-poppins text-sm">
                                        Active
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2 cursor-pointer">
                                    <RadioGroupItem value="inactive" id="product-status-inactive" />
                                    <Label htmlFor="product-status-inactive" className="cursor-pointer font-poppins text-sm">
                                        Inactive
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label className="font-poppins">Price ($)</Label>
                            <Input
                                type="number"
                                placeholder="0"
                                min="0"
                                value={form.price}
                                onChange={(e) => updateNumberField("price", e.target.value)}
                                className="font-poppins"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="font-poppins">Sale Percentage (%)</Label>
                            <Input
                                type="number"
                                placeholder="0"
                                min="0"
                                max="100"
                                value={form.salesPercentage}
                                onChange={(e) => updateNumberField("salesPercentage", e.target.value)}
                                className="font-poppins"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="font-poppins">Stock</Label>
                            <Input
                                type="number"
                                placeholder="0"
                                min="0"
                                value={form.stock}
                                onChange={(e) => updateNumberField("stock", e.target.value)}
                                className="font-poppins"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <ColorPicker
                            colors={form.colors}
                            onAddColor={addColor}
                            onRemoveColor={removeColor}
                        />
                        <SizeSelector
                            selectedSizes={form.sizes}
                            onToggleSize={toggleSizes}
                        />
                    </div>

                    <ImagePicker
                        product={product}
                        localFiles={localFiles}
                        onLocalFilesChange={setLocalFiles}
                    />
                </div>

                <DialogFooter className="flex items-center justify-end gap-2 pt-4 border-t">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isPending}
                        className="font-poppins cursor-pointer"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={submit}
                        disabled={isPending}
                        className="font-poppins cursor-pointer gap-2"
                    >
                        {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                        {product ? "Save Changes" : "Create Product"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {alertPopup && (
            <AlertPopup
                isOpen={alertPopup.isOpen}
                type={alertPopup.type}
                title={alertPopup.title}
                description={alertPopup.description}
                onClose={() => setAlertPopup(null)}
            />
        )}
    </>
    );
};

export default ProductDialog;
