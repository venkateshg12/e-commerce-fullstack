import { formatDiscount } from "@/lib/price";
import { Link } from "react-router-dom";
import { Heart, ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { COLOR_MAP } from "@/constants/constant";
import type { WishlistItem } from "@/types";
import type { ProductSize } from "@repo/types";
import { useState } from "react";

// How many swatches fit on a card before the rest collapse into a "+N" chip — matches
// CustomerProductCard so a product looks the same on the wishlist as it does in collections.
const MAX_VISIBLE_COLORS = 4;

type WishlistItemCardProps = {
  item: WishlistItem;
  onRemove: (productId: string) => void;
  onMoveToCart: (item: WishlistItem, size?: ProductSize) => void;
  isRemoving: boolean;
  isMoving: boolean;
};

const WishlistItemCard = ({
  item,
  onRemove,
  onMoveToCart,
  isRemoving,
  isMoving,
}: WishlistItemCardProps) => {
  // Shown after "Move to cart" is pressed on a product that has sizes — the cart can't change a
  // size after the fact, so it has to be chosen here rather than guessed.
  const [isPickingSize, setIsPickingSize] = useState(false);

  const hasSale = item.salesPercentage > 0;
  // Nothing left in any colour or size: the card still shows the product, but moving it to the
  // cart would only fail server-side.
  const isSoldOut = item.totalStock <= 0;
  const colors = (item.colors ?? []).filter(Boolean);
  const visibleColors = colors.slice(0, MAX_VISIBLE_COLORS);
  const hiddenColorCount = colors.length - visibleColors.length;
  const sizes = (item.sizes ?? []).filter(Boolean);

  const handleMoveClick = () => {
    if (sizes.length > 0) {
      setIsPickingSize(true);
      return;
    }
    onMoveToCart(item);
  };

  return (
    <Card className="product-card">
      <div className="product-card-media">
        <Link to={`/collections/${item.productId}`}>
          {item.image ? (
            <img
              src={item.image}
              alt={item.title}
              className="product-card-image"
              loading="lazy"
            />
          ) : (
            <div className="product-card-image-fallback">
              <ImageIcon className="h-8 w-8" />
            </div>
          )}
        </Link>

        {hasSale ? (
          <Badge className="product-card-sale-badge">-{formatDiscount(item.salesPercentage)}%</Badge>
        ) : null}

        {isSoldOut ? <span className="product-card-sold-out-veil">Sold out</span> : null}

        <div className="wishlist-move-overlay">
          {isPickingSize ? (
            <>
              <p className="wishlist-size-prompt">Select a size</p>
              <div className="wishlist-size-options">
                {sizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    className="wishlist-size-option"
                    disabled={isMoving}
                    onClick={() => {
                      setIsPickingSize(false);
                      onMoveToCart(item, size);
                    }}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <Button
              type="button"
              size="sm"
              className="wishlist-move-button"
              disabled={isMoving || isRemoving || isSoldOut}
              onClick={handleMoveClick}
            >
              {isSoldOut ? "Sold out" : isMoving ? "Moving..." : "Move to cart"}
            </Button>
          )}
        </div>
      </div>

      <Link to={`/collections/${item.productId}`} className="product-card-body">
        <p className="product-card-brand">{item.brand}</p>
        <p className="product-card-title">{item.title}</p>

        {colors.length ? (
          <div className="product-card-colors">
            {visibleColors.map((color) => (
              <span
                key={color}
                className="product-card-color-dot"
                style={{ backgroundColor: COLOR_MAP[String(color).toLowerCase()] || color }}
                title={color}
              />
            ))}

            {hiddenColorCount > 0 ? (
              <span className="product-card-color-more">{hiddenColorCount}+</span>
            ) : null}
          </div>
        ) : null}

        <div className="product-card-price-row">
          <span className="product-card-price">₹{item.finalPrice.toFixed(2)}</span>
          {hasSale ? (
            <span className="product-card-original-price">₹{item.price.toFixed(2)}</span>
          ) : null}
        </div>
      </Link>

      <button
        type="button"
        aria-label="Remove from wishlist"
        disabled={isRemoving}
        onClick={(event) => {
          event.preventDefault();
          onRemove(item.productId);
        }}
        className="wishlist-remove-button"
      >
        <Heart className="wishlist-remove-icon" />
      </button>
    </Card>
  );
};

export default WishlistItemCard;
