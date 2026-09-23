import type { ProductSize, ProductVariant } from "@/types/product.types";

// A variant whose count may be blank while it is being typed. Saved variants are the same shape
// with a number, so one grid builder serves both.
export type EditableVariant = Omit<ProductVariant, "stock"> & { stock: number | "" };

/**
 * Stock belongs to a (colour, size) variant. A cart line, an order item and a variant row all
 * identify themselves by that pair, so it is turned into a key in one place — an absent value and
 * an empty string mean the same thing, matching how the backend compares them.
 */
export const getVariantKey = (color?: string | null, size?: string | null) =>
    `${color || ""}|${size || ""}`;

export const findVariant = (
    variants: ProductVariant[] | undefined,
    color?: string | null,
    size?: string | null
) => {
    const key = getVariantKey(color, size);
    return (variants ?? []).find((variant) => getVariantKey(variant.color, variant.size) === key);
};

// A pair with no row of its own is sold out rather than unlimited — an unknown variant is not a
// stocked one, which is exactly how the server treats it.
export const getVariantStock = (
    variants: ProductVariant[] | undefined,
    color?: string | null,
    size?: string | null
) => findVariant(variants, color, size)?.stock ?? 0;

export const getTotalStock = (variants: ProductVariant[] | undefined) =>
    (variants ?? []).reduce((sum, variant) => sum + (variant.stock || 0), 0);

// Whether a colour can be bought at all: any size of it still in stock. A product with no colours
// answers for itself.
export const isColorAvailable = (variants: ProductVariant[] | undefined, color?: string) =>
    (variants ?? []).some(
        (variant) => (variant.color || "") === (color || "") && variant.stock > 0
    );

/**
 * The rows a product should have for its colours and sizes: every combination, or a single keyless
 * row when it has neither. Counts are carried over by key, so editing the colour or size list
 * never silently resets the stock of the combinations that survive. Mirrors the backend helper in
 * `utils/variants.ts`.
 */
export const buildVariantGrid = (
    colors: string[],
    sizes: ProductSize[],
    // Accepts a cell mid-edit as well as a saved row: the admin form holds stock as `number | ""`
    // so a box can be emptied, and reshaping the grid shouldn't fill that back in.
    existing: EditableVariant[] = []
): EditableVariant[] => {
    const previous = new Map(
        existing.map((variant) => [getVariantKey(variant.color, variant.size), variant.stock])
    );

    const colorSlots: (string | undefined)[] = colors.length ? colors : [undefined];
    const sizeSlots: (ProductSize | undefined)[] = sizes.length ? sizes : [undefined];

    const grid: EditableVariant[] = [];
    for (const color of colorSlots) {
        for (const size of sizeSlots) {
            grid.push({
                color,
                size,
                stock: previous.get(getVariantKey(color, size)) ?? 0,
            });
        }
    }

    return grid;
};
