import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import CustomerFiltersPanel from "@/components/user/collections/CustomerFiltersPanel";
import CustomerProductCard from "@/components/user/collections/CustomerProductCard";
import CustomerProductCardSkeleton from "@/components/user/collections/CustomerProductCardSkeleton";
import { useCollections } from "@/hooks/collections/useCollections";
import { cn } from "@/lib/utils";
import type { ProductSort } from "@/types";

const Collections = () => {
  const {
    categories,
    subCategories,
    activeCategoryName,
    products,
    isInitialLoading,
    isFetching,
    filters,
    sort,
    hasActiveFilters,
    changeSort,
    availableColors,
    toggleFacet,
    clearFilters,
    activeFilterBadges,
    brands,
    search,
    applySearch,
  } = useCollections();

  const skeletonGrid = (
    <div className="product-grid" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <CustomerProductCardSkeleton key={`product-skeleton-${index}`} />
      ))}
    </div>
  );

  const renderProducts = () => {
    // Cold load: nothing has ever arrived, so show placeholders shaped like real cards.
    if (isInitialLoading) return skeletonGrid;

    if (products.length) {
      return (
        <div className={cn("product-grid", isFetching && "product-grid-busy")}>
          {products.map((item) => (
            <CustomerProductCard key={item._id} product={item} />
          ))}
        </div>
      );
    }

    // The previous filter also returned nothing, so there are no results to hold on to
    // while this one loads. Show skeletons rather than flashing the empty state.
    if (isFetching) return skeletonGrid;

    return (
      <Card className="empty-card">
        <CardContent className="empty-card-content">
          <p className="empty-title">
            {search ? `No products match "${search}"` : "No Products Found"}
          </p>
          {hasActiveFilters ? (
            <Button onClick={clearFilters} className=" cursor-pointer action-button">
              Clear Filters
            </Button>
          ) : null}
          {search ? (
            <Button
              variant="outline"
              onClick={() => applySearch("")}
              className="cursor-pointer action-button"
            >
              Clear Search
            </Button>
          ) : null}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="collections-page-wrap">
      <section className="hero-section">
        <div className="hero-container">
          <p className="hero-eyebrow">New Collections</p>

          <div className="hero-content">
            <div className="hero-title-wrap">
              <h1 className="hero-title">Premium everyday essentials</h1>
            </div>

            <div className="sort-wrap">
              <Select
                value={sort}
                onValueChange={(value) => changeSort(value as ProductSort)}
              >
                <SelectTrigger className="sort-trigger">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>

                <SelectContent align="end" className="w-[190px] cursor-pointer">
                  <SelectItem value="recent">Newest First</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </section>

      <div className="content-container">
        <div className={cn("top-bar", !activeFilterBadges.length && !search && "top-bar-flush")}>

          {/* mobile sheet component */}
          <div className="top-bar-actions">
            <Sheet>
              <SheetTrigger asChild>
                <Button className="mobile-filter-button">
                  <SlidersHorizontal className="mobile-filter-icon" />
                  Filters
                </Button>
              </SheetTrigger>

              <SheetContent side="left" className="mobile-sheet-content">
                <SheetHeader className="mobile-sheet-header">
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>

                <CustomerFiltersPanel
                  categories={categories}
                  subCategories={subCategories}
                  activeCategoryName={activeCategoryName}
                  brands={brands}
                  filters={filters}
                  availableColors={availableColors}
                  hasActiveFilters={hasActiveFilters}
                  onClearFilters={clearFilters}
                  onToggleFacet={toggleFacet}
                />
              </SheetContent>
            </Sheet>
          </div>

          {/* The term came from the header search box, so this is where it can be seen and
              dropped without retyping the URL. */}
          {search ? (
            <button
              type="button"
              onClick={() => applySearch("")}
              className="search-chip"
            >
              Search: {search}
              <X className="search-chip-icon" />
            </button>
          ) : null}
        </div>

        <div className="layout-grid">
          <aside className="desktop-aside">
            <Card className="desktop-filter-card">
              <CustomerFiltersPanel
                categories={categories}
                subCategories={subCategories}
                activeCategoryName={activeCategoryName}
                brands={brands}
                filters={filters}
                availableColors={availableColors}
                hasActiveFilters={hasActiveFilters}
                onClearFilters={clearFilters}
                onToggleFacet={toggleFacet}
              />
            </Card>
          </aside>

          <section className="product-section" aria-busy={isFetching}>
            {renderProducts()}
          </section>
        </div>
      </div>
    </div>
  );
};

export default Collections;
