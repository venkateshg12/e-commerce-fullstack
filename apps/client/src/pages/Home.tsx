import { Skeleton } from "@/components/ui/skeleton";
import { Modal } from "@/components/ui/modal";
import HomeCategoryGrid from "@/components/user/home/HomeCategoryGrid";
import HomeCouponGrid from "@/components/user/home/HomeCouponGrid";
import HomeHero from "@/components/user/home/HomeHero";
import HomeProductGrid from "@/components/user/home/HomeProductGrid";
import { useGetCustomerCategories } from "@/hooks/collections/useGetCustomerCategories";
import { useGetHomeFeed } from "@/hooks/home/useGetHomeFeed";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import Signin from "@/pages/auth/Signin";
import Signup from "@/pages/auth/Signup";
import { useAuthStore } from "@/store/auth.store";
import { Navigate, useNavigate } from "react-router-dom";

type HomeProps = {
  // Set by the /login, /register and /password/forgot routes: the auth form opens as a modal over
  // the storefront instead of on a page of its own.
  showAuth?: "login" | "register" | "forgot";
};

/**
 * The one storefront home page, shared by guests and signed-in customers. Admins don't shop, so
 * they are sent to their dashboard instead.
 */
const Home = ({ showAuth }: HomeProps) => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isBootstrapped = useAuthStore((state) => state.isBootstrapped);
  const { data, isPending } = useGetHomeFeed();
  // Categories come from GET /categories, not the feed: that's the cache entry every admin
  // category/type edit invalidates, so changes appear here immediately. It also carries each
  // category's types.
  const { data: categoriesData, isPending: isCategoriesPending } = useGetCustomerCategories();

  if (isBootstrapped && user?.role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  const feed = data?.data;
  const banners = feed?.banners ?? [];
  const categories = categoriesData?.data ?? [];
  const coupons = feed?.coupons ?? [];
  const products = feed?.recentProducts ?? [];

  return (
    <div className="home-page-wrap">
      {/* The hero sits outside the padded container so it runs edge to edge. While loading it
          shows the slider's shape; if the feed fails it falls back to its text version rather
          than leaving the storefront blank. */}
      {isPending ? (
        <Skeleton className="home-skeleton-hero" />
      ) : (
        <HomeHero banners={banners} isSignedIn={Boolean(user)} />
      )}

      <div className="home-container">
        {isCategoriesPending ? (
          <div className="home-category-grid" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={`category-skeleton-${index}`} className="h-36 rounded-2xl" />
            ))}
          </div>
        ) : categories.length ? (
          <HomeCategoryGrid categories={categories} />
        ) : null}

        {coupons.length ? <HomeCouponGrid coupons={coupons} /> : null}

        {isPending ? (
          <div className="home-product-grid" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={`product-skeleton-${index}`} className="aspect-3/4 w-full rounded-lg" />
            ))}
          </div>
        ) : products.length ? (
          <HomeProductGrid products={products} />
        ) : null}
      </div>

      {showAuth ? (
        <Modal isOpen onClose={() => navigate("/")}>
          {showAuth === "login" ? <Signin /> : showAuth === "register" ? <Signup /> : <ForgotPassword />}
        </Modal>
      ) : null}
    </div>
  );
};

export default Home;
