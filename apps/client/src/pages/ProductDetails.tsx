import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, Heart, ShoppingBag, Share2, Truck } from "lucide-react";
import { AlertPopup } from "@/components/ui/alert-popup";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import CustomerProductCard from "@/components/user/collections/CustomerProductCard";
import ProductGallery from "@/components/user/collections/ProductGallery";
import { pluralize } from "@/constants/constant";
import { useAddToCart } from "@/hooks/cart/useAddToCart";
import { useProductDetails } from "@/hooks/collections/useProductDetails";
import { useGetWishlist } from "@/hooks/wishlist/useGetWishlist";
import { useToggleWishlistItem } from "@/hooks/wishlist/useToggleWishlistItem";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import type { ProductSize } from "@/types";

type FeedbackState = {
  type: "success" | "error";
  title: string;
  description: string;
};

const ProductDetailsView = ({ id }: { id?: string }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);

  const { product, sameType, sameCategory, sameBrand, isLoading, isError } =
    useProductDetails(id);
  const addToCartMutation = useAddToCart();
  const { data: wishlist } = useGetWishlist();
  const toggleWishlistMutation = useToggleWishlistItem();

  const [selectedSize, setSelectedSize] = useState<ProductSize | "">("");
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  // Opening another product from a "See more" rail lands at the top of the new page, not the bottom.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  if (isLoading) {
    return (
      <div className="pdp-wrap">
        <div className="pdp-container">
          <div className="pdp-layout">
            <Skeleton className="pdp-skeleton-gallery" />

            <div className="pdp-info">
              <Skeleton className="pdp-skeleton-block" />
              <Skeleton className="pdp-skeleton-block" />
              <Skeleton className="pdp-skeleton-block" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="pdp-wrap">
        <div className="pdp-container">
          <Card className="pdp-missing">
            <p className="empty-title">Product not found</p>
            <p className="pdp-missing-text">
              This product may have been removed or is no longer available.
            </p>
            <Button asChild className="action-button">
              <Link to="/collections">Back to collections</Link>
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const salePercentage = Number(product.salesPercentage) || 0;
  const hasSale = salePercentage > 0;
  const originalPrice = Number(product.price) || 0;
  const finalPrice = hasSale
    ? originalPrice - (originalPrice * salePercentage) / 100
    : originalPrice;

  // Cover first, matching ProductGallery's own ordering, so an index means the same photo in the
  // gallery and in the More Colors grid.
  const orderedImages = [...(product.images ?? [])].sort(
    (a, b) => Number(b?.isCover) - Number(a?.isCover)
  );
  const activeImage = orderedImages[activeImageIndex];

  // The product's colour palette — still shown as a count in Specs.
  const colors = (product.colors ?? []).filter(Boolean);

  const sizes = (product.sizes ?? []).filter(Boolean);
  const inStock = Number(product.stock) > 0;
  const isLowStock = inStock && Number(product.stock) <= 5;
  const categoryHref = `/collections?category=${product.category?._id ?? ""}`;
  // Same type → same category → same brand. Empty sections are dropped.
  const relatedSections = [
    {
      key: "type",
      title: `More ${pluralize(product.subCategory?.name ?? "")}`,
      products: sameType,
      href: categoryHref,
    },
    {
      key: "category",
      title: `More in ${product.category?.name ?? "this category"}`,
      products: sameCategory,
      href: categoryHref,
    },
    {
      key: "brand",
      title: `More from ${product.brand?.name ?? "this brand"}`,
      products: sameBrand,
      href: `/collections?brand=${product.brand?._id ?? ""}`,
    },
  ].filter((section) => section.products.length);

  const isWishlisted =
    wishlist?.data.items.some((item) => item.productId === product._id) ?? false;

  const handleToggleWishlist = () => {
    // Same gate and redirect pattern as add-to-cart — wishlist is auth-only on the backend too.
    if (!user) {
      navigate("/login", { state: { from: location } });
      return;
    }

    const wasWishlisted = isWishlisted;

    toggleWishlistMutation.mutate(
      { productId: product._id },
      {
        onSuccess: () => {
          setFeedback({
            type: "success",
            title: wasWishlisted ? "Removed from wishlist" : "Added to wishlist",
            description: wasWishlisted
              ? `${product.title} was removed from your wishlist.`
              : `${product.title} was added to your wishlist.`,
          });
        },
        onError: (error) => {
          setFeedback({
            type: "error",
            title: "Could not update wishlist",
            description: error?.message || "Something went wrong. Please try again.",
          });
        },
      }
    );
  };

  const handleAddToCart = (thenGoToCart: boolean) => {
    // Cart lives behind auth on the backend, so send guests to login and bring them back.
    if (!user) {
      navigate("/login", { state: { from: location } });
      return;
    }

    if (sizes.length && !selectedSize) {
      setFeedback({
        type: "error",
        title: "Select a size",
        description: "Please choose a size before adding this item to your cart.",
      });
      return;
    }

    addToCartMutation.mutate(
      {
        productId: product._id,
        quantity: 1,
        // Untagged photos give undefined, and the backend falls back to the product's first colour.
        color: activeImage?.color || undefined,
        size: (selectedSize || undefined) as ProductSize | undefined,
        // Whichever photo is showing right now — from the rail or More Colors — is this line's image.
        image: activeImage?.url,
      },
      {
        onSuccess: () => {
          if (thenGoToCart) {
            navigate("/cart");
            return;
          }

          setFeedback({
            type: "success",
            title: "Added to cart",
            description: `${product.title} is now in your cart.`,
          });
        },
        onError: (error) => {
          setFeedback({
            type: "error",
            title: "Could not add to cart",
            description: error?.message || "Something went wrong. Please try again.",
          });
        },
      }
    );
  };

  return (
    <div className="pdp-wrap">
      <div className="pdp-container">
        <div className="pdp-topbar">
          <Button
            variant="ghost"
            className="pdp-back-button"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft data-icon="inline-start" />
            Back
          </Button>

          <nav className="pdp-breadcrumb" aria-label="Breadcrumb">
            <Link to="/collections" className="pdp-breadcrumb-link">
              Collections
            </Link>
            <span className="pdp-breadcrumb-divider">/</span>
            <span>{product.category?.name || "Product"}</span>
          </nav>
        </div>

        <div className="pdp-layout">
          <div className="pdp-gallery-col">
            <ProductGallery
              images={orderedImages}
              title={product.title}
              activeIndex={activeImageIndex}
              onSelect={setActiveImageIndex}
            />

            <div className="pdp-gallery-actions">
              <Button
                variant="outline"
                size="icon"
                className="cursor-pointer"
                aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                aria-pressed={isWishlisted}
                disabled={toggleWishlistMutation.isPending}
                onClick={handleToggleWishlist}
              >
                <Heart className={cn(isWishlisted && "pdp-wishlist-icon-active")} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="cursor-pointer"
                aria-label="Share product"
              >
                <Share2 />
              </Button>
            </div>
          </div>

          <div className="pdp-info">
            <Card className="pdp-card">
              <div className="pdp-heading">
                <p className="pdp-brand">{product.brand?.name}</p>
                <h1 className="pdp-title">{product.title}</h1>
              </div>

              <div className="pdp-price-row">
                <span className="pdp-price">Rs.{finalPrice.toFixed(2)}</span>

                {hasSale ? (
                  <>
                    <span className="pdp-price-original">
                      Rs.{originalPrice.toFixed(2)}
                    </span>
                    <Badge className="pdp-sale-badge">{salePercentage}% OFF</Badge>
                  </>
                ) : null}
              </div>

              {orderedImages.length > 1 ? (
                <div className="pdp-option-group">
                  <p className="pdp-option-label">More Colors</p>

                  {/* Shares activeImageIndex with the gallery rail: a click swaps only the main
                      image — no filtering, no re-ordering, no navigation. */}
                  <div className="pdp-more-colors">
                    {orderedImages.map((image, index) => (
                      <button
                        key={image.publicId || image.url}
                        type="button"
                        aria-label={`Show colour ${index + 1}`}
                        aria-pressed={index === activeImageIndex}
                        onClick={() => setActiveImageIndex(index)}
                        className={cn(
                          "pdp-more-colors-tile",
                          index === activeImageIndex && "pdp-more-colors-tile-active"
                        )}
                      >
                        <img
                          src={image.url}
                          alt=""
                          loading="lazy"
                          className="pdp-more-colors-image"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </Card>

            <Card className="pdp-card">
              {sizes.length ? (
                <div className="pdp-option-group">
                  <p className="pdp-option-label">Size</p>

                  <div className="pdp-sizes">
                    {sizes.map((size) => (
                      <button
                        key={size}
                        type="button"
                        aria-pressed={selectedSize === size}
                        onClick={() =>
                          setSelectedSize(selectedSize === size ? "" : size)
                        }
                        className={cn(
                          "pdp-size",
                          selectedSize === size && "pdp-size-active"
                        )}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="pdp-stock-row">
                {inStock ? (
                  <span className="pdp-stock-in">
                    <Check className="pdp-stock-icon" />
                    {isLowStock
                      ? `Only ${product.stock} left in stock`
                      : "In stock"}
                  </span>
                ) : (
                  <span className="pdp-stock-out">Out of stock</span>
                )}
              </div>

              <div className="pdp-actions">
                <Button
                  variant="outline"
                  className="pdp-action-secondary"
                  disabled={!inStock || addToCartMutation.isPending}
                  onClick={() => handleAddToCart(false)}
                >
                  <ShoppingBag data-icon="inline-start" />
                  {addToCartMutation.isPending ? "Adding..." : "Add to cart"}
                </Button>

                <Button
                  className="pdp-action-primary"
                  disabled={!inStock || addToCartMutation.isPending}
                  onClick={() => handleAddToCart(true)}
                >
                  Buy Now
                </Button>
              </div>

              <p className="pdp-shipping">
                <Truck className="pdp-shipping-icon" />
                Free delivery on orders over Rs.999
              </p>
            </Card>

            <Card className="pdp-card">
              <h2 className="pdp-section-title">Specs</h2>

              <div className="pdp-specs">
                <div className="pdp-spec">
                  <p className="pdp-spec-label">Brand</p>
                  <p className="pdp-spec-value">{product.brand?.name || "—"}</p>
                </div>

                <div className="pdp-spec">
                  <p className="pdp-spec-label">Category</p>
                  <p className="pdp-spec-value">
                    {product.category?.name || "—"}
                  </p>
                </div>

                <div className="pdp-spec">
                  <p className="pdp-spec-label">Sizes</p>
                  <p className="pdp-spec-value">
                    {sizes.length ? sizes.join(", ") : "One size"}
                  </p>
                </div>

                <div className="pdp-spec">
                  <p className="pdp-spec-label">Colors</p>
                  <p className="pdp-spec-value">{colors.length || "—"}</p>
                </div>
              </div>

              {product.description ? (
                <>
                  <Separator />
                  <p className="pdp-description">{product.description}</p>
                </>
              ) : null}
            </Card>
          </div>
        </div>

        {relatedSections.map((section) => (
          <section key={section.key} className="pdp-related">
            <div className="pdp-related-head">
              <h2 className="pdp-section-title">{section.title}</h2>
              <Link to={section.href} className="pdp-related-link">
                View all
              </Link>
            </div>

            <div className="pdp-related-rail">
              {section.products.map((item) => (
                <div key={item._id} className="pdp-related-item">
                  <CustomerProductCard product={item} />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <AlertPopup
        isOpen={Boolean(feedback)}
        type={feedback?.type ?? "success"}
        title={feedback?.title ?? ""}
        description={feedback?.description ?? ""}
        onClose={() => setFeedback(null)}
        autoCloseDuration={feedback?.type === "success" ? 2200 : undefined}
      />
    </div>
  );
};

// Keyed on the id so moving between products remounts the view: the selected image and size
// reset instead of carrying over from the previous product.
const ProductDetails = () => {
  const { id } = useParams<{ id: string }>();
  return <ProductDetailsView key={id} id={id} />;
};

export default ProductDetails;
