import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import { useState } from "react";

type ColorPickerProps = {
  colors?: string[];
  onAddColor?: (color: string) => void;
  onRemoveColor?: (color: string) => void;
};

const ColorPicker = ({ colors = [], onAddColor, onRemoveColor }: ColorPickerProps) => {
  const [currentColor, setCurrentColor] = useState("#000000");

  const handleAddColor = () => {
    if (currentColor && !colors.includes(currentColor)) {
      onAddColor?.(currentColor);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="font-poppins text-sm font-medium">Colors</Label>
      <div className="flex flex-col gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-card">
        {/* Color picker input & add button row */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center gap-2 px-2.5 py-1 rounded-lg border border-input bg-background cursor-pointer hover:border-primary/50 transition-colors">
            <Input
              type="color"
              value={currentColor}
              onChange={(e) => setCurrentColor(e.target.value)}
              className="w-7 h-7 p-0 border-0 rounded-md cursor-pointer bg-transparent"
            />
            <span className="font-mono text-xs font-medium uppercase text-muted-foreground">
              {currentColor}
            </span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleAddColor}
            className="cursor-pointer font-poppins gap-1 h-9"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Color
          </Button>
        </div>

        {colors.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {colors.map((color) => (
              <span
                key={color}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 shadow-2xs transition-colors"
              >
                <span
                  className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="uppercase text-slate-700 dark:text-slate-300">{color}</span>
                <button
                  type="button"
                  onClick={() => onRemoveColor?.(color)}
                  className="hover:text-destructive text-slate-400 cursor-pointer transition-colors ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ColorPicker;