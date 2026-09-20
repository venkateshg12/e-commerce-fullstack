import { ProductDocument, ProductSize, ProductVariant } from "../types/product.types";

/**
 * Stock belongs to a (colour, size) variant, and a cart line, an order item and a variant row all
 * identify themselves by that same pair. This is the one place that pair is turned into a key, so
 * the comparison can't drift between them — it mirrors how cart lines are matched, where an
 * absent value and an empty string mean the same thing.
 */
export const getVariantKey = (color?: string | null, size?: string | null) =>
    `${color || ""}|${size || ""}`;

export const findVariant = (
    product: Pick<ProductDocument, "variants">,
    color?: string | null,
    size?: string | null
): ProductVariant | undefined => {
    const key = getVariantKey(color, size);
    return (product.variants ?? []).find(
        (variant) => getVariantKey(variant.color, variant.size) === key
    );
};

// What a shopper can still buy of one combination. A pair with no row of its own is sold out
// rather than unlimited: an unknown variant is not a stocked one.
export const getVariantStock = (
    product: Pick<ProductDocument, "variants">,
    color?: string | null,
    size?: string | null
) => findVariant(product, color, size)?.stock ?? 0;

// Across every variant — for "is this product buyable at all" and the admin's stock column.
export const getTotalStock = (product: Pick<ProductDocument, "variants">) =>
    (product.variants ?? []).reduce((sum, variant) => sum + (variant.stock || 0), 0);

/**
 * The rows a product should have, given its colours and sizes: every combination, or a single
 * keyless row when it has neither. Existing counts are carried over by key, so editing the colour
 * or size list never silently resets the stock of the combinations that survive.
 */
export const buildVariantGrid = (
    colors: string[],
    sizes: ProductSize[],
    existing: ProductVariant[] = []
): ProductVariant[] => {
    const previous = new Map(
        existing.map((variant) => [getVariantKey(variant.color, variant.size), variant.stock || 0])
    );

    const colorSlots: (string | undefined)[] = colors.length ? colors : [undefined];
    const sizeSlots: (ProductSize | undefined)[] = sizes.length ? sizes : [undefined];

    const grid: ProductVariant[] = [];
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

/**
 * The `arrayFilters` entry that picks out one line's variant row for an atomic `$inc`, guarding
 * that the row still holds enough. `null` matches a missing field in Mongo, so a product with no
 * colours or sizes is matched by its single keyless row.
 *
 * Callers MUST assert on `modifiedCount`, not `matchedCount`: the document matches regardless of
 * whether any array element satisfied this filter.
 */
export const variantFilter = (item: {
    color?: string | null;
    size?: string | null;
    quantity: number;
}) => ({
    "variant.color": item.color || null,
    "variant.size": item.size || null,
    "variant.stock": { $gte: item.quantity },
});

// The same row, with no stock floor — for putting stock back after a return.
export const restockFilter = (item: { color?: string | null; size?: string | null }) => ({
    "variant.color": item.color || null,
    "variant.size": item.size || null,
});
