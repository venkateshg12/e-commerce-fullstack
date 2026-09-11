import { Button } from "@/components/ui/button";
import {
  BRAND_OPTIONS,
  COLOR_FILTER_ENABLED,
  COLOR_MAP,
  SIZE_OPTIONS,
} from "@/constants/constant";
import { cn } from "@/lib/utils";
import type {
  CustomerProductFilters,
  FacetKey,
  ProductCategory,
} from "@/types";

type CustomerFiltersPanelProps = {
  categories: ProductCategory[];
  filters: CustomerProductFilters;
  availableColors: string[];
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onToggleFacet: (key: FacetKey, value: string) => void;
};

const CustomerFiltersPanel = ({
  categories,
  filters,
  availableColors,
  hasActiveFilters,
  onClearFilters,
  onToggleFacet,
}: CustomerFiltersPanelProps) => {
  const renderOption = (key: FacetKey, value: string, label: string) => {
    const isActive = filters[key] === value;

    return (
      <button
        key={`${key}-${value}`}
        type="button"
        aria-pressed={isActive}
        onClick={() => onToggleFacet(key, value)}
        className={cn("facet-option", isActive && "facet-option-active")}
      >
        {label}
      </button>
    );
  };

  // Colors are shown as bare circles, so the name only survives as the accessible label.
  const renderSwatch = (color: string) => {
    const isActive = filters.color === color;

    return (
      <button
        key={`color-${color}`}
        type="button"
        title={color}
        aria-label={color}
        aria-pressed={isActive}
        onClick={() => onToggleFacet("color", color)}
        className={cn("facet-swatch", isActive && "facet-swatch-active")}
        style={{ backgroundColor: COLOR_MAP[String(color).toLowerCase()] || color }}
      />
    );
  };

  return (
    <div className="filters-panel">
      <div className="filters-panel-header">
        <p className="filters-panel-title">Filters</p>

        {hasActiveFilters ? (
          <Button
            variant="ghost"
            className="filters-clear-button"
            onClick={onClearFilters}
          >
            Clear all
          </Button>
        ) : null}
      </div>

      <div className="facet-group">
        <p className="facet-group-title">Category</p>

        <div className="facet-options-wrap">
          {categories?.length ? (
            categories.map((item) =>
              item?._id
                ? renderOption("category", item._id, item.name || "")
                : null,
            )
          ) : (
            <p className="facet-empty">No categories available</p>
          )}
        </div>
      </div>

      <div className="facet-group">
        <p className="facet-group-title">Brand</p>

        <div className="facet-options-wrap">
          {(BRAND_OPTIONS || []).map((brand) =>
            renderOption("brand", brand, brand),
          )}
        </div>
      </div>

      {COLOR_FILTER_ENABLED ? (
        <div className="facet-group">
          <p className="facet-group-title">Color</p>

          <div className="facet-swatches-wrap">
            {availableColors?.length ? (
              availableColors.map((color) => (color ? renderSwatch(color) : null))
            ) : (
              <p className="facet-empty">No colors available</p>
            )}
          </div>
        </div>
      ) : null}

      <div className="facet-group">
        <p className="facet-group-title">Size</p>

        <div className="facet-options-wrap">
          {SIZE_OPTIONS.map((size) => renderOption("size", size, size))}
        </div>
      </div>
    </div>
  );
};

export default CustomerFiltersPanel;
