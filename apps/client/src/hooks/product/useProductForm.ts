import { buildVariantGrid, type EditableVariant } from "@/lib/variants";
import type { LocalImage, Product, ProductImage, ProductSize, ProductVariant } from "@/types/product.types";
import type { ProductSchema } from "@repo/types";
import { useEffect, useRef, useState } from "react";
import { useCreateProduct } from "./useCreateProduct";
import { useUpdateProduct } from "./useUpdateProduct";
import { useUploadProductImages } from "./useUploadProductImages";

type UseProductFormOptions = {
    open: boolean;
    product?: Product | null;
    onSaved: () => Promise<void> | void;
    onClose: () => void;
};

/**
 * The three numeric fields are held as `number | ""`.
 *
 * Bound straight to a number, clearing the input produced `Number("") === 0`, which snapped the
 * field back to "0" on every keystroke — you could never replace the default without selecting
 * the text first. Empty is now a real state, and `submit()` rejects it.
 */
/**
 * A stock cell while it is being edited. Same reason as the price fields: bound straight to a
 * number, clearing the box reads back as 0 and the digit you type lands after it. An emptied cell
 * stays empty here and is saved as 0.
 */
export type FormVariant = EditableVariant;

type ProductFormValues = Omit<ProductSchema, "price" | "salesPercentage" | "variants"> & {
    variants: FormVariant[];
    price: number | "";
    /*
      What the shopper actually pays. The backend still stores a discount percentage against
      `price`, so this is the form's field and the percentage is derived from the pair on save —
      pricing an item is a decision about two amounts, not about a percentage.
     */
    salePrice: number | "";
};

export type NumericProductField = "price" | "salePrice";

// The stored percentage that turns `price` into `salePrice`. Not rounded: at 799 → 719 it is
// 10.0125%, and rounding it to 10 would quietly sell the item for 719.10.
const getSalesPercentage = (price: number, salePrice: number) =>
    price > 0 ? ((price - salePrice) / price) * 100 : 0;

// The reverse, for seeding the form from a saved product.
const getSalePrice = (price: number, salesPercentage: number) =>
    price - (price * salesPercentage) / 100;

function getEmptyForm(): ProductFormValues {
    return {
        title: "",
        description: "",
        category: "",
        brand: "",
        colors: [],
        sizes: [],
        subCategory: undefined,
        price: 0,
        salePrice: 0,
        // A product with no colours and no sizes still needs one row to hold its count.
        variants: buildVariantGrid([], [], []),
        status: "active",
    };
}

const mapProductToFormValue = (product: Product): ProductFormValues => {
    return {
        title: product.title,
        description: product.description,
        category: product.category._id,
        brand: product.brand?._id ?? "",
        colors: product.colors ?? [],
        sizes: (product.sizes as ProductSize[]) ?? [],
        subCategory: product.subCategory?._id,
        price: product.price,
        salePrice: getSalePrice(product.price, product.salesPercentage ?? 0),
        // Rebuilt from the product's own lists, so a colour added since the rows were written
        // shows up in the matrix at 0 instead of being missing from it.
        variants: buildVariantGrid(
            product.colors ?? [],
            (product.sizes as ProductSize[]) ?? [],
            product.variants ?? []
        ),
        status: product.status,
    };
};

const getCoverImage = (images?: ProductImage[]) => {
    if (!images || images.length === 0) return undefined;
    return images.find((img) => img.isCover) ?? images[0];
};

type AlertPopupState = {
    isOpen: boolean;
    type: "success" | "error" | "info" | "warning";
    title: string;
    description: string;
};

const useProductForm = ({ open, product, onSaved, onClose }: UseProductFormOptions) => {
    const [form, setForm] = useState<ProductFormValues>(getEmptyForm());
    // File and colour stay in ONE object so the pairing can never drift when the list is
    // reordered (the picker shows newest-first) or filtered.
    const [localImages, setLocalImages] = useState<LocalImage[]>([]);
    const [alertPopup, setAlertPopup] = useState<AlertPopupState | null>(null);

    const createMutation = useCreateProduct();
    const updateMutation = useUpdateProduct();
    const uploadImageMutation = useUploadProductImages();

    const isPending = createMutation.isPending || updateMutation.isPending || uploadImageMutation.isPending;
    const cover = getCoverImage(product?.images);

    // Reset the form only when the dialog opens or a *different* product is loaded. The product
    // prop is resolved live from the store, so an image upload, the list refetch and the
    // pending-image poller all hand us a new object for the same product. Resetting on every one
    // of those overwrote unsaved edits (new colours, title, price…) mid-edit.
    const formSessionKey = `${open}:${product?._id ?? "new"}`;
    const lastFormSessionKey = useRef<string | null>(null);

    useEffect(() => {
        if (lastFormSessionKey.current === formSessionKey) return;
        lastFormSessionKey.current = formSessionKey;

        setForm(product ? mapProductToFormValue(product) : getEmptyForm());
        setLocalImages([]);
        setAlertPopup(null);
    }, [formSessionKey, product]);

    function updateFormField<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
        setForm((prev) => ({
            ...prev,
            [key]: value,
        }));
    }

    // A type belongs to one category, so changing the category drops the chosen type.
    function updateCategory(category: string) {
        setForm((prev) => ({
            ...prev,
            category,
            subCategory: prev.category === category ? prev.subCategory : undefined,
        }));
    }

    // Keeps an emptied input empty instead of coercing it to 0.
    function updateNumberField(key: NumericProductField, raw: string) {
        const parsed = raw === "" ? "" : Number(raw);

        setForm((prev) => ({
            ...prev,
            [key]: parsed === "" || Number.isNaN(parsed) ? "" : parsed,
        }));
    }

    /*
      Colours and sizes define the stock matrix, so each edit rebuilds the rows. `buildVariantGrid`
      carries counts across by (colour, size), which means removing a colour and adding it back
      loses only that colour's numbers — every other cell keeps what was typed.
     */
    function addColor(color: string) {
        setForm((prev) => {
            const colors = prev.colors.includes(color) ? prev.colors : [...prev.colors, color];
            return { ...prev, colors, variants: buildVariantGrid(colors, prev.sizes, prev.variants) };
        });
    }

    function removeColor(color: string) {
        setForm((prev) => {
            const colors = prev.colors.filter((item) => item !== color);
            return { ...prev, colors, variants: buildVariantGrid(colors, prev.sizes, prev.variants) };
        });
    }

    function toggleSizes(size: ProductSize) {
        setForm((prev) => {
            const sizes = prev.sizes.includes(size)
                ? prev.sizes.filter((item) => item !== size)
                : [...prev.sizes, size];
            return { ...prev, sizes, variants: buildVariantGrid(prev.colors, sizes, prev.variants) };
        });
    }

    // One cell of the matrix. Rows are addressed by (colour, size), never by index, so a
    // re-ordered grid can't write a count into the wrong cell.
    function updateVariantStock(color: string | undefined, size: ProductSize | undefined, raw: string) {
        // "" is kept as itself so the cell can actually be emptied; anything unparseable or
        // negative falls back to empty rather than silently becoming a number nobody typed.
        const parsed = Number(raw);
        const stock: number | "" =
            raw === "" || Number.isNaN(parsed) || parsed < 0 ? "" : Math.floor(parsed);

        setForm((prev) => ({
            ...prev,
            variants: prev.variants.map((variant) =>
                (variant.color || "") === (color || "") && (variant.size || "") === (size || "")
                    ? { ...variant, stock }
                    : variant
            ),
        }));
    }

    function removeLocalImage(index: number) {
        setLocalImages((prev) => prev.filter((_, i) => i !== index));
    }

    function resetForm() {
        setForm(product ? mapProductToFormValue(product) : getEmptyForm());
        setLocalImages([]);
        setAlertPopup(null);
    }

    function warn(title: string, description: string) {
        setAlertPopup({ isOpen: true, type: "warning", title, description });
    }

    async function submit() {
        if (!form.title.trim()) {
            warn("Title Required", "Please enter a product title before submitting.");
            return;
        }

        if (!form.brand.trim()) {
            warn("Brand Required", "Please select a Brand for the product before submitting.");
            return;
        }

        if (!form.description.trim()) {
            warn("Description Required", "Please enter a description for the product.");
            return;
        }

        if (!form.category.trim()) {
            warn("Category Required", "Please select a Category for the product.");
            return;
        }

        // An empty numeric field is a real state now, so it has to be rejected explicitly
        // rather than silently submitted as 0.
        if (form.price === "") {
            warn("Price Required", "Please enter a price for the product.");
            return;
        }

        if (Number(form.price) < 0) {
            warn("Invalid Price", "Price cannot be negative.");
            return;
        }

        if (form.salePrice === "") {
            warn("Selling Price Required", "Enter the price shoppers pay — the same as the original price if there's no discount.");
            return;
        }

        if (Number(form.salePrice) < 0) {
            warn("Invalid Selling Price", "Selling price cannot be negative.");
            return;
        }

        if (Number(form.salePrice) > Number(form.price)) {
            warn("Selling Price Too High", "The selling price can't be more than the original price.");
            return;
        }

        if (form.variants.length === 0) {
            warn("Stock Rows Missing", "Add at least one colour or size combination to hold stock.");
            return;
        }

        if (form.variants.some((variant) => variant.stock !== "" && (!Number.isInteger(variant.stock) || variant.stock < 0))) {
            warn("Invalid Stock", "Every stock count must be a whole number and cannot be negative.");
            return;
        }

        // An emptied cell means none in stock — that is what the server is sent.
        const variants: ProductVariant[] = form.variants.map((variant) => ({
            ...variant,
            stock: variant.stock === "" ? 0 : variant.stock,
        }));

        // Every photo carries the colour it shows, set while it was staged. Uploading an untagged
        // photo is what leaves the storefront unable to tell which photo belongs to which colour.
        if (form.colors.length > 0 && localImages.some((image) => !image.color)) {
            warn("Colour Missing", "Choose the colour each selected photo shows before saving.");
            return;
        }

        try {
            if (product?._id) {
                await updateMutation.mutateAsync({
                    productId: product._id,
                    payload: {
                        title: form.title.trim(),
                        description: form.description.trim(),
                        category: form.category,
                        brand: form.brand,
                        colors: form.colors,
                        sizes: form.sizes,
                        // null tells the server to clear a type that was removed.
                        subCategory: form.subCategory ?? null,
                        price: Number(form.price),
                        salesPercentage: getSalesPercentage(Number(form.price), Number(form.salePrice)),
                        variants,
                        status: form.status,
                    },
                });
            } else {
                const res = await createMutation.mutateAsync({
                    title: form.title.trim(),
                    description: form.description.trim(),
                    category: form.category,
                    brand: form.brand,
                    colors: form.colors,
                    sizes: form.sizes,
                    subCategory: form.subCategory,
                    price: Number(form.price),
                    salesPercentage: getSalesPercentage(Number(form.price), Number(form.salePrice)),
                    variants,
                    status: form.status,
                });

                const newProductId = res?.data?._id;

                if (newProductId && localImages.length > 0) {
                    await uploadImageMutation.mutateAsync({
                        productId: newProductId,
                        files: localImages.map((image) => image.file),
                        // Index-aligned with `files` by construction — same array, same order.
                        colors: localImages.map((image) => image.color ?? ""),
                    });
                }
            }

            await onSaved();
            onClose();
        } catch (err: any) {
            setAlertPopup({
                isOpen: true,
                type: "error",
                title: "Action Failed",
                description: err?.response?.data?.message || err?.message || "Failed to save product. Please try again.",
            });
        }
    }

    return {
        form,
        alertPopup,
        setAlertPopup,
        isPending,
        isEditMode: !!product,
        cover,
        updateFormField,
        updateNumberField,
        updateCategory,
        addColor,
        removeColor,
        toggleSizes,
        updateVariantStock,
        localImages,
        setLocalImages,
        removeLocalImage,
        submit,
        resetForm,
    };
};

export default useProductForm;