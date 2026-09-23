import { formatDiscount } from "@/lib/price";
import { getTotalStock, getVariantStock, isColorAvailable } from "@/lib/variants";
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
import { COLOR_MAP, pluralize } from "@/constants/constant";
import { useAddToCart } from "@/hooks/cart/useAddToCart";
import { addGuestCartItem, getGuestWishlist, toggleGuestWishlistItem } from "@/lib/guestBag";
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
  // null until the shopper picks a colour; the selection is then theirs, not the gallery's.
  const [chosenColor, setChosenColor] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  // A guest's saved-for-later products live in this browser, so the heart reflects that store
  // rather than the (auth-only) wishlist query.
  const [guestWishlisted, setGuestWishlisted] = useState(() => (id ? getGuestWishlist().includes(id) : false));

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
  // gallery and in the colour selector.
  const orderedImages = [...(product.images ?? [])].sort(
    (a, b) => Number(b?.isCover) - Number(a?.isCover)
  );

  // The product's colour palette — still shown as a count in Specs.
  const colors = (product.colors ?? []).filter(Boolean);

  /*
    One mapping, used in both directions: photo index → the colour it shows. Everything below
    reads this, so a photo and its swatch can never disagree.

    Normally the colour comes from the tag the admin set on the photo at upload. Products
    uploaded before photos could be tagged have none, so as a fallback — and only when there are
    exactly as many photos as colours, i.e. one photo per colour — they are paired by position.
    Any other untagged shape is left unmapped rather than guessed at.
   */
  const isTagged = orderedImages.some((image) => Boolean(image.color));
  const photoColors = orderedImages.map((image, index) =>
    isTagged ? image.color : orderedImages.length === colors.length ? colors[index] : undefined
  );

  // Colour → the photo showing it, so picking a swatch can show that colour. -1 when the colour
  // has no photo of its own, in which case the photo on screen stays put.
  const photoIndexForColour = (color: string) => photoColors.indexOf(color);

  // The cover is what every cart line carries, whichever photo the shopper happens to be viewing.
  const coverImage = orderedImages.find((image) => image.isCover) ?? orderedImages[0];

  /*
    The photo on screen decides the highlighted colour: browsing the gallery rail moves the
    highlight with it, and clicking a colour jumps the gallery to that colour's photo — so the two
    always agree. `chosenColor` only carries the choice for photos with no colour of their own,
    where the gallery can't say what is showing.
   */
  const selectedColor = photoColors[activeImageIndex] ?? chosenColor ?? colors[0] ?? undefined;

  const sizes = (product.sizes ?? []).filter(Boolean);
  const variants = product.variants ?? [];

  /*
    Availability is read per (colour, size), never per product: the selected pair decides whether
    Add to cart works, while the product-wide total only answers "is anything left at all".
    A colour with no size in stock is shown as sold out but stays selectable — it still sells the
    product, it just can't be bought today.
   */
  const selectedColorSoldOut = colors.length > 0 && !isColorAvailable(variants, selectedColor);
  const selectedStock = getVariantStock(variants, selectedColor, selectedSize || undefined);
  // With no size chosen yet, the question is whether this colour has any size left.
  const canBuySelection = sizes.length && !selectedSize
    ? isColorAvailable(variants, selectedColor)
    : selectedStock > 0;
  const isLowStock = selectedStock > 0 && selectedStock <= 5;
  const anyStock = getTotalStock(variants) > 0;
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

  const isWishlisted = user
    ? (wishlist?.data.items.some((item) => item.productId === product._id) ?? false)
    : guestWishlisted;

  const handleToggleWishlist = () => {
    /*
      Wishlist is auth-only on the backend, but a guest's choice is kept in this browser and merged
      into their account when they sign in (lib/guestBag.ts) — better than sending them to login and
      losing what they picked.
     */
    if (!user) {
      const saved = toggleGuestWishlistItem(product._id);
      setGuestWishlisted(saved);
      setFeedback({
        type: "success",
        title: saved ? "Saved for later" : "Removed from wishlist",
        description: saved
          ? `${product.title} is saved on this device. Sign in and it moves to your wishlist.`
          : `${product.title} was removed.`,
      });
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
    if (sizes.length && !selectedSize) {
      setFeedback({
        type: "error",
        title: "Select a size",
        description: "Please choose a size before adding this item to your cart.",
      });
      return;
    }

    /*
      The cart lives behind auth on the backend, so a guest's line is kept in this browser and
      merged into their real cart at sign-in. Checking out still needs an account, so "Buy now"
      goes to login — but with the item already saved, so nothing is lost on the way.
     */
    if (!user) {
      addGuestCartItem({
        productId: product._id,
        quantity: 1,
        color: selectedColor,
        size: (selectedSize || undefined) as ProductSize | undefined,
        image: coverImage?.url,
      });

      if (thenGoToCart) {
        navigate("/login", { state: { from: location } });
        return;
      }

      setFeedback({
        type: "success",
        title: "Saved to your cart",
        description: `${product.title} is saved on this device. Sign in to check out — we'll keep it for you.`,
      });
      return;
    }

    addToCartMutation.mutate(
      {
        productId: product._id,
        quantity: 1,
        // The colour the shopper chose — not the tag on whichever photo happens to be showing.
        color: selectedColor,
        size: (selectedSize || undefined) as ProductSize | undefined,
        // Always the cover, never the photo being browsed: the cart line is identified by its
        // colour and size, and the picture is just the product's.
        image: coverImage?.url,
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
                    <Badge className="pdp-sale-badge">{formatDiscount(salePercentage)}% OFF</Badge>
                  </>
                ) : null}
              </div>

              {selectedColorSoldOut ? (
                <Badge variant="outline" className="pdp-sold-out-badge">
                  Sold out in {selectedColor}
                </Badge>
              ) : null}

              {colors.length > 0 || orderedImages.length > 1 ? (
                <div className="pdp-option-group">
                  <p className="pdp-option-label">Colour</p>

                  {/* Every colour the product comes in; the one on screen is ringed. */}
                  <div className="pdp-colour-row">
                    {colors.map((color) => {
                      const soldOut = !isColorAvailable(variants, color);

                      return (
                      <button
                        key={color}
                        type="button"
                        title={soldOut ? `${color} — sold out` : color}
                        aria-label={soldOut ? `Colour ${color}, sold out` : `Colour ${color}`}
                        aria-pressed={color === selectedColor}
                        onClick={() => {
                          setChosenColor(color);
                          // A colour with no photo of its own leaves the gallery where it is.
                          const index = photoIndexForColour(color);
                          if (index !== -1) setActiveImageIndex(index);
                        }}
                        className={cn(
                          "pdp-colour-dot",
                          color === selectedColor && "pdp-colour-dot-active",
                          // Paled, not hidden: a sold-out colour still shows what the product
                          // comes in, it just can't be bought today.
                          soldOut && "pdp-colour-dot-sold-out"
                        )}
                        style={{ backgroundColor: COLOR_MAP[color.toLowerCase()] || color }}
                      />
                      );
                    })}
                  </div>

                  {/* Every photo. Picking one swaps the main image and, when that photo carries
                      a colour, moves the ring in the colour row above. */}
                  <div className="pdp-more-colors">
                    {orderedImages.map((image, index) => (
                      <button
                        key={image.publicId || image.url}
                        type="button"
                        aria-label={
                          photoColors[index]
                            ? `Photo ${index + 1}, colour ${photoColors[index]}`
                            : `Photo ${index + 1}`
                        }
                        aria-pressed={index === activeImageIndex}
                        onClick={() => {
                          setActiveImageIndex(index);
                          // Picking a photo is also picking its colour — the swatch above moves
                          // with it, and that is the colour the cart line gets.
                          const color = photoColors[index];
                          if (color) setChosenColor(color);
                        }}
                        className={cn(
                          "pdp-more-colors-tile",
                          index === activeImageIndex && "pdp-more-colors-tile-active",
                          photoColors[index] && !isColorAvailable(variants, photoColors[index])
                            ? "pdp-more-colors-tile-sold-out"
                            : null
                        )}
                      >
                        <img
                          src={image.url}
                          alt=""
                          loading="lazy"
                          className="pdp-more-colors-image"
                        />
                        {/* Only mapped photos get a dot, so it's clear which still need one. */}
                        {photoColors[index] ? (
                          <span
                            className="pdp-more-colors-dot"
                            style={{
                              backgroundColor:
                                COLOR_MAP[photoColors[index]!.toLowerCase()] || photoColors[index],
                            }}
                          />
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
                    {sizes.map((size) => {
                      // This size in the colour on screen — a size can be gone in green and
                      // waiting in red.
                      const soldOut = getVariantStock(variants, selectedColor, size) <= 0;

                      return (
                        <button
                          key={size}
                          type="button"
                          disabled={soldOut}
                          title={soldOut ? `${size} is sold out in this colour` : undefined}
                          aria-pressed={selectedSize === size}
                          onClick={() =>
                            setSelectedSize(selectedSize === size ? "" : size)
                          }
                          className={cn(
                            "pdp-size",
                            selectedSize === size && "pdp-size-active",
                            soldOut && "pdp-size-sold-out"
                          )}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="pdp-stock-row">
                {!anyStock ? (
                  <span className="pdp-stock-out">Out of stock</span>
                ) : selectedColorSoldOut ? (
                  <span className="pdp-stock-out">
                    {selectedColor} is sold out — try another colour
                  </span>
                ) : canBuySelection ? (
                  <span className="pdp-stock-in">
                    <Check className="pdp-stock-icon" />
                    {isLowStock ? `Only ${selectedStock} left` : "In stock"}
                  </span>
                ) : (
                  <span className="pdp-stock-out">
                    {selectedSize
                      ? `Size ${selectedSize} is sold out in this colour`
                      : "This combination is sold out"}
                  </span>
                )}
              </div>

              <div className="pdp-actions">
                <Button
                  variant="outline"
                  className="pdp-action-secondary"
                  disabled={!canBuySelection || addToCartMutation.isPending}
                  onClick={() => handleAddToCart(false)}
                >
                  <ShoppingBag data-icon="inline-start" />
                  {addToCartMutation.isPending ? "Adding..." : "Add to cart"}
                </Button>

                <Button
                  className="pdp-action-primary"
                  disabled={!canBuySelection || addToCartMutation.isPending}
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
