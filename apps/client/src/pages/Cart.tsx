import { AlertPopup } from "@/components/ui/alert-popup";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import CartDeliverTo from "@/components/user/cart/CartDeliverTo";
import CartItemGroup from "@/components/user/cart/CartItemGroup";
import CartLineItemSkeleton from "@/components/user/cart/CartLineItemSkeleton";
import CartSteps from "@/components/user/cart/CartSteps";
import ListPagination from "@/components/common/ListPagination";
import OrderSummaryCard from "@/components/user/cart/OrderSummaryCard";
import { useGetAddresses } from "@/hooks/account/useGetAddresses";
import { useClearCart } from "@/hooks/cart/useClearCart";
import { useDeleteCartItem } from "@/hooks/cart/useDeleteCartItem";
import { useGetCart } from "@/hooks/cart/useGetCart";
import { useUpdateCartItem } from "@/hooks/cart/useUpdateCartItem";
import { useAddToWishlist } from "@/hooks/wishlist/useAddToWishlist";
import { getCartGroups, getCartSubtotal, getLineKey } from "@/lib/cart";
import type { AlertType, CartItem } from "@/types";
import { useIsMutating } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const CART_PAGE_SIZE = 5;

type FeedbackState = {
  type: AlertType;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

const Cart = () => {
  const navigate = useNavigate();
  const { data, isPending } = useGetCart();
  const { data: addressesData, isLoading: isAddressesLoading } = useGetAddresses();
  const updateMutation = useUpdateCartItem();
  const deleteMutation = useDeleteCartItem();
  const clearMutation = useClearCart();
  const addToWishlistMutation = useAddToWishlist();

  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  // Which row is mid-request, so only that one dims.
  const [busyKey, setBusyKey] = useState("");
  const [page, setPage] = useState(1);

  // Every cart write returns the whole cart, so one in flight makes every row's number stale.
  // Locking all of them for the round-trip removes the double-click race entirely.
  const isCartMutating = useIsMutating({ mutationKey: ["cart"] }) > 0;

  const items = data?.data.items ?? [];
  const totalQuantity = data?.data.totalQuantity ?? 0;
  const addresses = addressesData?.data ?? [];
  const deliveryAddress = addresses.find((address) => address.isDefault) ?? addresses[0] ?? null;

  // The backend sends list price and sale price per unit, which is exactly the MRP/discount split.
  const totalMrp = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const subtotal = getCartSubtotal(items);
  const discountOnMrp = totalMrp - subtotal;

  // Same product+size in several colours reads as ONE entry, so pagination counts entries, not
  // individual colour lines.
  const groups = getCartGroups(items);
  const totalPages = Math.max(1, Math.ceil(groups.length / CART_PAGE_SIZE));
  // Clamped by derivation rather than an effect: deleting the last row on the last page shrinks
  // totalPages, and this corrects in the same render instead of flashing an empty page first.
  const currentPage = Math.min(page, totalPages);
  const rangeStart = (currentPage - 1) * CART_PAGE_SIZE;
  const visibleGroups = groups.slice(rangeStart, rangeStart + CART_PAGE_SIZE);
  const isPaginated = groups.length > CART_PAGE_SIZE;

  const showError = (title: string, error: unknown) => {
    setFeedback({
      type: "error",
      title,
      description:
        (error as { message?: string } | null)?.message ||
        "Something went wrong. Please try again.",
    });
  };

  // PATCH takes the line's new absolute quantity, which is exactly what the dropdown hands over.
  const handleQuantityChange = (item: CartItem, nextQuantity: number) => {
    setBusyKey(getLineKey(item));
    updateMutation.mutate(
      {
        productId: item.productId,
        quantity: nextQuantity,
        color: item.color,
        size: item.size,
      },
      {
        // The dropdown already stops at this line's available stock, so this catches the case
        // where someone else bought the last one since the cart was loaded. Nothing moves on
        // screen because the cache is only written on success.
        onError: (error) => showError("Couldn't update quantity", error),
        onSettled: () => setBusyKey(""),
      }
    );
  };

  const handleRemove = (item: CartItem) => {
    setBusyKey(getLineKey(item));
    deleteMutation.mutate(
      { productId: item.productId, color: item.color, size: item.size },
      {
        onError: (error) => showError("Couldn't remove item", error),
        onSettled: () => setBusyKey(""),
      }
    );
  };

  /**
   * Save first, then remove from the bag — in that order, so a failure never loses the item:
   * if saving fails nothing is removed, and if only the removal fails the item is safe in both.
   * Only this line leaves the bag; the same product in another size stays.
   */
  const handleMoveToWishlist = (item: CartItem) => {
    const lineKey = getLineKey(item);
    setBusyKey(lineKey);

    addToWishlistMutation.mutate(
      { productId: item.productId },
      {
        onSuccess: () => {
          deleteMutation.mutate(
            { productId: item.productId, color: item.color, size: item.size },
            {
              onSuccess: () =>
                setFeedback({
                  type: "success",
                  title: "Moved to wishlist",
                  description: `${item.title} is saved in your wishlist.`,
                }),
              onError: (error) =>
                showError("Saved, but still in your bag", error),
              onSettled: () => setBusyKey(""),
            }
          );
        },
        onError: (error) => {
          setBusyKey("");
          showError("Couldn't move to wishlist", error);
        },
      }
    );
  };

  const promptClearCart = () => {
    setFeedback({
      type: "warning",
      title: "Clear your bag?",
      description: "Every item will be removed. This can't be undone.",
      actionLabel: "Remove",
      onAction: () => {
        clearMutation.mutate(undefined, {
          onSuccess: () => setFeedback(null),
          onError: (error) => showError("Couldn't clear bag", error),
        });
      },
    });
  };

  if (isPending) {
    return (
      <div className="cart-page-wrap">
        <div className="cart-container">
          <CartSteps current="Bag" />
          <div className="cart-layout">
            <div className="cart-main" aria-hidden="true">
              {Array.from({ length: 3 }).map((_, index) => (
                <CartLineItemSkeleton key={`cart-skeleton-${index}`} />
              ))}
            </div>
            <CartLineItemSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="cart-page-wrap">
        <div className="cart-container">
          <CartSteps current="Bag" />
          <Card className="empty-card">
            <CardContent className="empty-card-content">
              <p className="empty-title">Your bag is empty</p>
              <Button asChild className="action-button">
                <Link to="/collections">Browse collections</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page-wrap">
      <div className="cart-container">
        <CartSteps current="Bag" />

        <div className="cart-layout">
          <div className="cart-main">
            <CartDeliverTo address={deliveryAddress} loading={isAddressesLoading} />

            <div className="cart-items-header">
              <p className="cart-items-count">
                {totalQuantity} {totalQuantity === 1 ? "item" : "items"} in bag
              </p>
              <Button
                type="button"
                variant="ghost"
                className="cart-clear-button"
                disabled={isCartMutating}
                onClick={promptClearCart}
              >
                Remove all
              </Button>
            </div>

            <section className="cart-lines">
              {visibleGroups.map((group) => (
                <CartItemGroup
                  key={group.key}
                  group={group}
                  onQuantityChange={handleQuantityChange}
                  onRemove={handleRemove}
                  onMoveToWishlist={handleMoveToWishlist}
                  isDisabled={isCartMutating}
                  busyKey={busyKey}
                />
              ))}
            </section>

            {isPaginated ? (
              <ListPagination
                label="Cart pages"
                currentPage={currentPage}
                totalPages={totalPages}
                rangeStart={rangeStart + 1}
                rangeEnd={rangeStart + visibleGroups.length}
                totalItems={groups.length}
                onPageChange={setPage}
              />
            ) : null}

            <Link to="/wishlist" className="cart-wishlist-link">
              <span className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Add more from wishlist
              </span>
              <span aria-hidden="true">›</span>
            </Link>
          </div>

          <aside className="cart-aside">
            <OrderSummaryCard
              totalQuantity={totalQuantity}
              totalMrp={totalMrp}
              discountOnMrp={discountOnMrp}
              total={subtotal}
              couponSlot={
                <Link to="/checkout" className="cart-summary-link">
                  Apply coupon
                </Link>
              }
            >
              <Button
                type="button"
                className="cart-place-order-button"
                disabled={isCartMutating}
                onClick={() => navigate("/checkout")}
              >
                Place order
              </Button>
              <Button asChild variant="outline" className="cart-continue-button">
                <Link to="/collections">Continue shopping</Link>
              </Button>
            </OrderSummaryCard>
          </aside>
        </div>
      </div>

      {feedback && (
        <AlertPopup
          isOpen
          type={feedback.type}
          title={feedback.title}
          description={feedback.description}
          actionLabel={feedback.actionLabel}
          onAction={feedback.onAction}
          isActionPending={clearMutation.isPending}
          onClose={() => setFeedback(null)}
        />
      )}
    </div>
  );
};

export default Cart;
