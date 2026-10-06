import { useGetCustomerCategories } from "@/hooks/collections/useGetCustomerCategories";
import { cn } from "@/lib/utils";
import { Link, useLocation, useSearchParams } from "react-router-dom";

// A row of quick-access chips under the header. The categories are the same cache entry the home
// page and the collections filters read, so this costs no extra request.
const CategoryPills = () => {
  const { data } = useGetCustomerCategories();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();

  const categories = data?.data ?? [];
  if (!categories.length) return null;

  const onCollections = pathname === "/collections";
  const activeCategory = onCollections ? searchParams.get("category") : null;

  return (
    <nav className="category-pills" aria-label="Shop by category">
      <div className="category-pills-row">
        <Link
          to="/collections"
          className={cn("category-pill", onCollections && !activeCategory && "category-pill-active")}
        >
          All products
        </Link>

        {categories.map((category) => (
          <Link
            key={category._id}
            to={`/collections?category=${category._id}`}
            className={cn("category-pill", activeCategory === category._id && "category-pill-active")}
          >
            {category.name}
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default CategoryPills;
