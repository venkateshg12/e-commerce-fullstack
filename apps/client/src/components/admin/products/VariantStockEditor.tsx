import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COLOR_MAP } from "@/constants/constant";
import type { FormVariant } from "@/hooks/product/useProductForm";
import type { ProductSize } from "@/types/product.types";

type VariantStockEditorProps = {
  colors: string[];
  sizes: ProductSize[];
  // Cells carry `number | ""` so one can be emptied while typing; "" counts as none in stock.
  variants: FormVariant[];
  onChange: (color: string | undefined, size: ProductSize | undefined, value: string) => void;
};

/**
 * Stock as a grid: a row per colour, a column per size, one count in each cell. A product sells
 * out per combination — green/L can be gone while green/M is on the shelf — so this is the shape
 * the number actually has. A product with no colours collapses to a single row, and one with no
 * sizes to a single column.
 */
const VariantStockEditor = ({ colors, sizes, variants, onChange }: VariantStockEditorProps) => {
  const colorRows: (string | undefined)[] = colors.length ? colors : [undefined];
  const sizeColumns: (ProductSize | undefined)[] = sizes.length ? sizes : [undefined];

  // An empty cell contributes nothing, exactly as a 0 would.
  const countOf = (variant: FormVariant) => (variant.stock === "" ? 0 : variant.stock);

  const cellValue = (color?: string, size?: ProductSize) =>
    variants.find(
      (variant) =>
        (variant.color || "") === (color || "") && (variant.size || "") === (size || "")
    )?.stock ?? "";

  const rowTotal = (color?: string) =>
    variants
      .filter((variant) => (variant.color || "") === (color || ""))
      .reduce((sum, variant) => sum + countOf(variant), 0);

  const total = variants.reduce((sum, variant) => sum + countOf(variant), 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="font-poppins">Stock per colour and size</Label>
        <span className="font-poppins text-xs text-muted-foreground">
          {total} in stock across {variants.length} {variants.length === 1 ? "row" : "rows"}
        </span>
      </div>

      <div className="scrollbar-slim overflow-x-auto rounded-xl border border-border/70 bg-muted/20 p-3">
        <table className="w-full min-w-max border-separate border-spacing-x-2 border-spacing-y-1">
          <thead>
            <tr>
              <th className="text-left font-poppins text-xs font-medium text-muted-foreground">
                {colors.length ? "Colour" : "All"}
              </th>
              {sizeColumns.map((size) => (
                <th
                  key={size ?? "one-size"}
                  className="w-20 text-center font-poppins text-xs font-medium text-muted-foreground"
                >
                  {size ?? "One size"}
                </th>
              ))}
              <th className="w-16 text-right font-poppins text-xs font-medium text-muted-foreground">
                Total
              </th>
            </tr>
          </thead>

          <tbody>
            {colorRows.map((color) => (
              <tr key={color ?? "no-colour"}>
                <td className="pr-3">
                  <span className="flex items-center gap-2 font-poppins text-sm">
                    {color ? (
                      <span
                        className="inline-block h-5 w-5 shrink-0 rounded-full border border-foreground shadow-xs"
                        style={{ backgroundColor: COLOR_MAP[color.toLowerCase()] || color }}
                      />
                    ) : null}
                    {color ?? "No colours"}
                  </span>
                </td>

                {sizeColumns.map((size) => (
                  <td key={`${color ?? ""}-${size ?? ""}`}>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      aria-label={`Stock for ${color ?? "this product"} ${size ?? ""}`.trim()}
                      value={cellValue(color, size)}
                      onChange={(event) => onChange(color, size, event.target.value)}
                      className="h-9 w-20 text-center font-poppins"
                    />
                  </td>
                ))}

                <td className="text-right font-poppins text-sm font-medium">{rowTotal(color)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="font-poppins text-xs text-muted-foreground">
        Adding or removing a colour or size reshapes this grid. Counts you have already entered are
        kept for the combinations that remain.
      </p>
    </div>
  );
};

export default VariantStockEditor;
