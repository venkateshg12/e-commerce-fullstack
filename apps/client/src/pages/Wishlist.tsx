import { Link } from "react-router-dom";
import { AlertPopup } from "@/components/ui/alert-popup";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import WishlistItemCard from "@/components/user/wishlist/WishlistItemCard";
import WishlistItemCardSkeleton from "@/components/user/wishlist/WishlistItemCardSkeleton";
import { useAddToCart } from "@/hooks/cart/useAddToCart";
import { useGetWishlist } from "@/hooks/wishlist/useGetWishlist";
import { useToggleWishlistItem } from "@/hooks/wishlist/useToggleWishlistItem";
import type { AlertType, WishlistItem } from "@/types";
import type { ProductSize } from "@repo/types";
import { useState } from "react";

type FeedbackState = {
  type: AlertType;
  title: string;
  description: string;
};

const Wishlist = () => {
  const { data, isPending } = useGetWishlist();
  const toggleWishlistMutation = useToggleWishlistItem();
  const addToCartMutation = useAddToCart();

  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  // Which card is mid-move, so only its button shows the pending label.
  const [movingProductId, setMovingProductId] = useState("");

  const items = data?.data.items ?? [];

  /**
   * "Move" is two calls: add to the cart, then drop it from the wishlist. The toggle endpoint is
   * safe to use for the second half precisely because the item is currently in the wishlist —
   * toggling it can only remove it. The removal is deliberately not treated as fatal: if it
   * fails, the item is already in the cart and saying "couldn't move" would be wrong.
   */
  const handleMoveToCart = (item: WishlistItem, size?: ProductSize) => {
    setMovingProductId(item.productId);

    addToCartMutation.mutate(
      {
        productId: item.productId,
        quantity: 1,
        size,
        // Without a colour the server falls back to the product's first one; send the only colour
        // when there is exactly one, so a single-colour product lands correctly.
        color: item.colors?.length === 1 ? item.colors[0] : undefined,
        image: item.image || undefined,
      },
      {
        onSuccess: () => {
          toggleWishlistMutation.mutate({ productId: item.productId });
          setFeedback({
            type: "success",
            title: "Moved to cart",
            description: `${item.title} is now in your cart.`,
          });
        },
        onError: (error) => {
          setFeedback({
            type: "error",
            title: "Couldn't move to cart",
            description:
              error?.message || "Something went wrong. Please try again.",
          });
        },
        onSettled: () => setMovingProductId(""),
      }
    );
  };

  const renderItems = () => {
    if (isPending) {
      return (
        <div className="wishlist-grid" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <WishlistItemCardSkeleton key={`wishlist-skeleton-${index}`} />
          ))}
        </div>
      );
    }

    if (items.length) {
      return (
        <div className="wishlist-grid">
          {items.map((item) => (
            <WishlistItemCard
              key={item.productId}
              item={item}
              onRemove={(productId) => toggleWishlistMutation.mutate({ productId })}
              onMoveToCart={handleMoveToCart}
              isRemoving={toggleWishlistMutation.isPending}
              isMoving={movingProductId === item.productId}
            />
          ))}
        </div>
      );
    }

    return (
      <Card className="empty-card">
        <CardContent className="empty-card-content">
          <p className="empty-title">Your wishlist is empty</p>
          <Button asChild className="action-button">
            <Link to="/collections">Browse collections</Link>
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="wishlist-page-wrap">
      <div className="wishlist-container">
        <h1 className="wishlist-heading">My Wishlist</h1>
        {renderItems()}
      </div>

      {feedback && (
        <AlertPopup
          isOpen
          type={feedback.type}
          title={feedback.title}
          description={feedback.description}
          onClose={() => setFeedback(null)}
        />
      )}
    </div>
  );
};

export default Wishlist;
