import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import WishlistItemCard from "@/components/user/wishlist/WishlistItemCard";
import WishlistItemCardSkeleton from "@/components/user/wishlist/WishlistItemCardSkeleton";
import { useGetWishlist } from "@/hooks/wishlist/useGetWishlist";
import { useToggleWishlistItem } from "@/hooks/wishlist/useToggleWishlistItem";

const Wishlist = () => {
  const { data, isPending } = useGetWishlist();
  const toggleWishlistMutation = useToggleWishlistItem();

  const items = data?.data.items ?? [];

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
              isRemoving={toggleWishlistMutation.isPending}
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
    </div>
  );
};

export default Wishlist;
