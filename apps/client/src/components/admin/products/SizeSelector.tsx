import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SIZE_OPTIONS } from "@/constants/constant";
import type { ProductSize } from "@/types/product.types";
type SizeSelectorProps = {
  selectedSizes?: ProductSize[];
  onToggleSize?: (size: ProductSize) => void;
};

const SizeSelector = ({ selectedSizes = [], onToggleSize }: SizeSelectorProps) => {

  return (
    <div className="space-y-2 w-full">
      <Label className="font-poppins text-sm font-medium">Available Sizes</Label>
      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-card flex items-center">
        <div className="grid grid-cols-5 gap-2 w-full">
          {SIZE_OPTIONS.map((size) => {
            const isSelected = selectedSizes.includes(size);
            return (
              <Button
                key={size}
                type="button"
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => onToggleSize?.(size)}
                className={`h-9 w-full rounded-lg font-poppins font-medium text-xs transition-all cursor-pointer ${
                  isSelected ? "shadow-xs scale-[1.02]" : "hover:border-primary/50 text-muted-foreground"
                }`}
              >
                {size}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SizeSelector;
