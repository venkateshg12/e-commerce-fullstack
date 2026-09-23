import type { ProductCategory } from "@/types";
import { ArrowRight, Shapes } from "lucide-react";
import { Link } from "react-router-dom";

// How many of a category's types are named on its tile before the rest collapse into "+N more".
const VISIBLE_TYPES = 3;

type HomeCategoryGridProps = {
  categories: ProductCategory[];
};

// Every category and type here comes straight from the database (GET /categories), in the same
// cache entry the admin's Manage Categories dialog invalidates on each edit.
const HomeCategoryGrid = ({ categories }: HomeCategoryGridProps) => {
  return (
    <section>
      <div className="home-section-head">
        <div>
          <p className="home-section-eyebrow">Categories</p>
          <h2 className="home-section-title">Browse by category</h2>
        </div>
        <Link to="/collections" className="home-view-all">
          View all
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="home-category-grid">
        {categories.map((category) => {
          const types = category.subCategories ?? [];
          const shownTypes = types.slice(0, VISIBLE_TYPES).map((type) => type.name);
          const hiddenCount = types.length - shownTypes.length;

          return (
            <Link
              key={category._id}
              to={`/collections?category=${category._id}`}
              className="home-category-tile"
            >
              <span className="home-category-icon">
                <Shapes className="h-5 w-5" />
              </span>

              <span className="block space-y-1">
                <span className="home-category-name block">{category.name}</span>
                <span className="home-category-types block">
                  {shownTypes.length
                    ? `${shownTypes.join(" · ")}${hiddenCount > 0 ? ` +${hiddenCount} more` : ""}`
                    : "Explore the range"}
                </span>
              </span>

              <span className="home-category-link">
                Shop {category.name}
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default HomeCategoryGrid;
