import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Address } from "@/types";
import { Link } from "react-router-dom";

type CartDeliverToProps = {
  address: Address | null;
  loading: boolean;
};

const CartDeliverTo = ({ address, loading }: CartDeliverToProps) => {
  if (loading) {
    return <Skeleton className="h-20 w-full rounded-lg" />;
  }

  // Nothing saved yet — point at the address book rather than showing an empty banner.
  if (!address) {
    return (
      <div className="cart-deliver-card">
        <p className="cart-deliver-label">No delivery address saved yet.</p>
        <Button asChild variant="outline" className="cart-deliver-change">
          <Link to="/account">Add address</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="cart-deliver-card">
      <div className="min-w-0">
        <p className="cart-deliver-label">
          Deliver to: <span className="cart-deliver-name">{address.fullName}</span>,{" "}
          <span className="cart-deliver-name">{address.postalCode}</span>
        </p>
        <p className="cart-deliver-address">
          {address.address}, {address.city}, {address.state}, {address.country}
        </p>
      </div>
      {/* The picker itself lives on the checkout step. */}
      <Button asChild variant="outline" className="cart-deliver-change">
        <Link to="/checkout">Change address</Link>
      </Button>
    </div>
  );
};

export default CartDeliverTo;
