import { formatDiscount } from "@/lib/price";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { COLOR_MAP } from "@/constants/constant";
import { getLineKey } from "@/lib/cart";
import { cn } from "@/lib/utils";
import type { CartGroup } from "@/lib/cart";
import type { CartItem } from "@/types";
import { Heart, ImageIcon, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import QuantitySelect from "./QuantitySelect";

type CartItemGroupProps = {
  group: CartGroup;
  onQuantityChange: (item: CartItem, nextQuantity: number) => void;
  onRemove: (item: CartItem) => void;
  onMoveToWishlist: (item: CartItem) => void;
  // True while any cart write is in flight — everything locks, since the responses are whole-cart.
  isDisabled: boolean;
  // The line key that is actually mid-request, so only that variation dims.
  busyKey: string;
};

/**
 * One card per product: a single main photo, then a row per colour/size variation. The server
 * still treats each variation as its own line — identified by (productId, color, size) — so
 * quantity and remove act on exactly one of them.
 */
const CartItemGroup = ({
  group,
  onQuantityChange,
  onRemove,
  onMoveToWishlist,
  isDisabled,
  busyKey,
}: CartItemGroupProps) => {
  // Price and sale are product-level, so the first variation speaks for the card.
  const [firstLine] = group.lines;
  const hasSale = firstLine.salesPercentage > 0;

  return (
    <Card className="cart-group">
      <Link to={`/collections/${group.productId}`} className="cart-group-media">
        {group.image ? (
          <img src={group.image} alt={group.title} className="cart-line-image" loading="lazy" />
        ) : (
          <div className="cart-line-image-fallback">
            <ImageIcon className="h-6 w-6" />
          </div>
        )}
      </Link>

      <div className="cart-group-body">
        <div>
          <p className="cart-line-brand">{group.brand}</p>
          <Link to={`/collections/${group.productId}`} className="cart-line-title">
            {group.title}
          </Link>
        </div>

        <div className="cart-line-price-row">
          <span className="cart-line-price">₹{firstLine.finalPrice.toFixed(2)}</span>
          {hasSale ? (
            <>
              <span className="cart-line-original-price">₹{firstLine.price.toFixed(2)}</span>
              <span className="cart-line-discount">{formatDiscount(firstLine.salesPercentage)}% OFF</span>
            </>
          ) : null}
          <span className="cart-group-each">each</span>
        </div>

        <div className="cart-group-lines">
          {group.lines.map((item) => {
            const isBusy = busyKey === getLineKey(item);

            return (
              <div key={getLineKey(item)} className={cn("cart-variation", isBusy && "opacity-60")}>
                <div className="cart-variation-labels">
                  {item.color ? (
                    <span
                      className="cart-line-swatch"
                      style={{ backgroundColor: COLOR_MAP[item.color.toLowerCase()] || item.color }}
                      title={item.color}
                      role="img"
                      aria-label={`Colour ${item.color}`}
                    />
                  ) : (
                    <span className="cart-colour-none">No colour</span>
                  )}
                  {item.size ? <span className="cart-line-pill">Size: {item.size}</span> : null}
                  {/* This line's own availability — checkout rejects it, so say so here first. */}
                  {item.availableStock <= 0 ? (
                    <span className="cart-line-sold-out">Sold out</span>
                  ) : item.availableStock < item.quantity ? (
                    <span className="cart-line-sold-out">Only {item.availableStock} left</span>
                  ) : null}
                </div>

                <QuantitySelect
                  quantity={item.quantity}
                  availableStock={item.availableStock}
                  disabled={isDisabled}
                  onChange={(nextQuantity) => onQuantityChange(item, nextQuantity)}
                />

                <span className="cart-variation-total">
                  ₹{(item.finalPrice * item.quantity).toFixed(2)}
                </span>

                <div className="cart-variation-actions">
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Move ${item.title}${item.color ? ` in ${item.color}` : ""} to wishlist`}
                    title="Move to wishlist"
                    className="cart-variation-action"
                    disabled={isDisabled || isBusy}
                    onClick={() => onMoveToWishlist(item)}
                  >
                    <Heart className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Remove ${item.title}${item.color ? ` in ${item.color}` : ""} from bag`}
                    title="Remove"
                    className="cart-variation-remove"
                    disabled={isDisabled || isBusy}
                    onClick={() => onRemove(item)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};

export default CartItemGroup;
