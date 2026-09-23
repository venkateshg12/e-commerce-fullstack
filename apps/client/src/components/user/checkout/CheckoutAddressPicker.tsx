import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Address } from "@/types";
import { MapPin } from "lucide-react";
import { Link } from "react-router-dom";

type CheckoutAddressPickerProps = {
  addresses: Address[];
  loading: boolean;
  selectedAddressId: string;
  onSelect: (addressId: string) => void;
};

const CheckoutAddressPicker = ({
  addresses,
  loading,
  selectedAddressId,
  onSelect,
}: CheckoutAddressPickerProps) => {
  return (
    <Card className="checkout-section">
      <CardHeader>
        <CardTitle className="checkout-section-title">
          <MapPin className="checkout-section-icon" />
          Delivery address
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="checkout-address-list">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        ) : addresses.length === 0 ? (
          // A link rather than a redirect — bouncing to /account would throw away an applied promo.
          <div className="checkout-address-empty">
            <p>You don't have a delivery address saved yet.</p>
            <Button asChild className="action-button">
              <Link to="/account">Add an address</Link>
            </Button>
          </div>
        ) : (
          <div className="checkout-address-list">
            {addresses.map((address) => (
              <label
                key={address._id}
                className={cn(
                  "checkout-address-option",
                  selectedAddressId === address._id && "checkout-address-option-active"
                )}
              >
                <input
                  type="radio"
                  name="checkout-address"
                  className="mt-1 cursor-pointer"
                  checked={selectedAddressId === address._id}
                  onChange={() => onSelect(address._id)}
                />
                <span className="min-w-0">
                  <span className="checkout-address-name">
                    {address.fullName}
                    {address.isDefault ? <Badge variant="secondary">Default</Badge> : null}
                  </span>
                  <span className="checkout-address-lines block">
                    {address.address}, {address.city}, {address.state} {address.postalCode},{" "}
                    {address.country}
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CheckoutAddressPicker;
