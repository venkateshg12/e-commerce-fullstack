import { AlertPopup } from "@/components/ui/alert-popup";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import useProductForm from "@/hooks/product/useProductForm";
import type { Brand, Category, Product } from "@/types/product.types";
import { Loader2 } from "lucide-react";
import ColorPicker from "./ColorPicker";
import ImagePicker from "./ImagePicker";
import SizeSelector from "./SizeSelector";
import VariantStockEditor from "./VariantStockEditor";


type ProductDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    categories: Category[];
    brands: Brand[];
    product: Product | null;
    onSaved: () => Promise<void>;
};

const ProductDialog = ({ open, onOpenChange, categories, brands, product, onSaved }: ProductDialogProps) => {
    const {
        form,
        alertPopup,
        setAlertPopup,
        isPending,
        updateFormField,
        updateNumberField,
        updateCategory,
        addColor,
        removeColor,
        toggleSizes,
        updateVariantStock,
        localImages,
        setLocalImages,
        submit,
    } = useProductForm({
        open,
        product,
        onSaved,
        onClose: () => onOpenChange(false),
    });

    // The discount is shown, never typed: the two amounts are the input, and this is what the
    // backend ends up storing as `salesPercentage`.
    const priceValue = Number(form.price) || 0;
    const salePriceValue = Number(form.salePrice) || 0;
    const isPriceValid = salePriceValue <= priceValue;
    const savings = Math.max(priceValue - salePriceValue, 0);
    const discountPercent = priceValue > 0 ? Math.round((savings / priceValue) * 100) : 0;

    const selectedCategory = categories.find((cat) => cat._id === form.category);
    // A plain `if`/ternary rather than `selectedCategory?.x` inline: the React Compiler's
    // auto-memoization hoists the dependency check on an optional chain to a bare (non-guarded)
    // property read, which throws once `selectedCategory` is undefined.
    const selectedCategoryName = selectedCategory ? selectedCategory.name : "";
    const types = selectedCategory ? selectedCategory.subCategories ?? [] : [];

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
                                    {brands.length === 0 ? (
                                        <div className="px-2 py-1.5 text-sm text-muted-foreground font-poppins">
                                            No brands yet. Add one in Manage Brands.
                                        </div>
                                    ) : (
                                        brands.map((brand) => (
                                            <SelectItem key={brand._id} value={brand._id} className="font-poppins">
                                                {brand.name}
                                            </SelectItem>
                                        ))
                                    )}
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
                                onValueChange={updateCategory}
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
                            {/* Only the chosen category's types; switching category clears it. The
                                key remounts the Select so a cleared value shows the placeholder again. */}
                            <Select
                                key={form.category}
                                value={form.subCategory}
                                onValueChange={(val) => updateFormField("subCategory", val)}
                                disabled={!selectedCategory}
                            >
                                <SelectTrigger className="font-poppins flex-1">
                                    <SelectValue placeholder={selectedCategory ? "Select Type" : "Select a category first"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {types.length === 0 ? (
                                        <div className="px-2 py-1.5 text-sm text-muted-foreground font-poppins">
                                            No types in {selectedCategoryName} yet. Add one in Manage Categories.
                                        </div>
                                    ) : (
                                        types.map((type) => (
                                            <SelectItem key={type._id} value={type._id} className="font-poppins">
                                                {type.name}
                                            </SelectItem>
                                        ))
                                    )}
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

                    <div className="space-y-3">
                        <div className="space-y-0.5">
                            <h3 className="font-poppins text-sm font-semibold text-foreground">Pricing</h3>
                            <p className="font-poppins text-xs text-muted-foreground">
                                Enter both amounts — the discount shoppers see is worked out from them.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label className="font-poppins">Original price (Rs.)</Label>
                                <Input
                                    type="number"
                                    placeholder="0"
                                    min="0"
                                    value={form.price}
                                    onChange={(e) => updateNumberField("price", e.target.value)}
                                    className="font-poppins"
                                />
                                <p className="font-poppins text-xs text-muted-foreground">Struck through on the product page</p>
                            </div>
                            <div className="space-y-2">
                                <Label className="font-poppins">Selling price (Rs.)</Label>
                                <Input
                                    type="number"
                                    placeholder="0"
                                    min="0"
                                    value={form.salePrice}
                                    onChange={(e) => updateNumberField("salePrice", e.target.value)}
                                    className="font-poppins"
                                />
                                <p className="font-poppins text-xs text-muted-foreground">What the shopper actually pays</p>
                            </div>
                            <div className="space-y-2">
                                <Label className="font-poppins">Discount</Label>
                                {/* Read-only: it is the consequence of the two amounts above, and the
                                    number the backend stores. */}
                                <div className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 font-poppins text-sm">
                                    {isPriceValid ? (
                                        discountPercent > 0 ? (
                                            <span>{discountPercent}% off · saves Rs.{savings.toFixed(2)}</span>
                                        ) : (
                                            <span className="text-muted-foreground">No discount</span>
                                        )
                                    ) : (
                                        <span className="text-destructive">Selling price is above the original</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="space-y-0.5">
                            <h3 className="font-poppins text-sm font-semibold text-foreground">Inventory</h3>
                            <p className="font-poppins text-xs text-muted-foreground">
                                Each colour and size is counted separately, so one can sell out while the rest stay on sale.
                            </p>
                        </div>

                        <VariantStockEditor
                            colors={form.colors}
                            sizes={form.sizes}
                            variants={form.variants}
                            onChange={updateVariantStock}
                        />
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
                        localImages={localImages}
                        onLocalImagesChange={setLocalImages}
                        palette={form.colors}
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
