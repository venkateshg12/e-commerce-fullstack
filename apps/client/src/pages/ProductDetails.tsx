import { useState } from "react";
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
import { COLOR_MAP } from "@/constants/constant";
import { useAddToCart } from "@/hooks/cart/useAddToCart";
import { useProductDetails } from "@/hooks/collections/useProductDetails";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import type { ProductSize } from "@/types";

type FeedbackState = {
  type: "success" | "error";
  title: string;
  description: string;
};

const ProductDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);

  const { product, relatedProducts, isLoading, isError } = useProductDetails(id);
  const addToCartMutation = useAddToCart();

  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<ProductSize | "">("");
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

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

  const allImages = product.images ?? [];

  // Swatches come from the product's colour palette, set by the admin in the product dialog.
  const colors = (product.colors ?? []).filter(Boolean);

  // If photos happen to carry a colour, narrow the gallery to the selected colour's photos.
  // Untagged catalogues fall through to every photo, so a colour click never blanks the gallery.
  const colorImages = selectedColor
    ? allImages.filter((image) => image.color?.trim() === selectedColor)
    : allImages;
  const visibleImages = colorImages.length ? colorImages : allImages;
  const sizes = (product.sizes ?? []).filter(Boolean);
  const inStock = Number(product.stock) > 0;
  const isLowStock = inStock && Number(product.stock) <= 5;

  // Each photo carries the colour it depicts, so selecting a colour narrows the gallery to
  // that colour's photos and jumps to the first of them.
  const handleSelectColor = (color: string) => {
    setSelectedColor(selectedColor === color ? "" : color);
    setActiveImageIndex(0);
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
        color: selectedColor || undefined,
        size: (selectedSize || undefined) as ProductSize | undefined,
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
              images={visibleImages}
              title={product.title}
              activeIndex={activeImageIndex}
              onSelect={setActiveImageIndex}
            />

            <div className="pdp-gallery-actions">
              <Button variant="outline" size="icon" aria-label="Add to wishlist">
                <Heart />
              </Button>
              <Button variant="outline" size="icon" aria-label="Share product">
                <Share2 />
              </Button>
            </div>
          </div>

          <div className="pdp-info">
            <Card className="pdp-card">
              <div className="pdp-heading">
                <p className="pdp-brand">{product.brand}</p>
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

              {colors.length ? (
                <div className="pdp-option-group">
                  <p className="pdp-option-label">Colors</p>

                  <div className="pdp-swatches">
                    {colors.map((color, index) => (
                      <button
                        key={color}
                        type="button"
                        aria-label={`Color option ${index + 1}`}
                        aria-pressed={selectedColor === color}
                        onClick={() => handleSelectColor(color)}
                        className={cn(
                          "pdp-swatch",
                          selectedColor === color && "pdp-swatch-active"
                        )}
                        style={{
                          backgroundColor:
                            COLOR_MAP[String(color).toLowerCase()] || color,
                        }}
                      >
                        {selectedColor === color ? (
                          <Check className="pdp-swatch-check" />
                        ) : null}
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
                  <p className="pdp-spec-value">{product.brand || "—"}</p>
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

        {relatedProducts.length ? (
          <section className="pdp-related">
            <div className="pdp-related-head">
              <h2 className="pdp-section-title">See more</h2>
              <Link to="/collections" className="pdp-related-link">
                View all
              </Link>
            </div>

            <div className="pdp-related-rail">
              {relatedProducts.map((item) => (
                <div key={item._id} className="pdp-related-item">
                  <CustomerProductCard product={item} />
                </div>
              ))}
            </div>
          </section>
        ) : null}
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

export default ProductDetails;
