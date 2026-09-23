import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Address } from "@/types";
import { MapPin, Pencil, Star, Trash2 } from "lucide-react";

type AddressCardProps = {
  address: Address;
  onEdit: (address: Address) => void;
  onDelete: (address: Address) => void;
  onSetDefault: (addressId: string) => void;
  isDeleting: boolean;
  isSettingDefault: boolean;
};

function AddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault,
  isDeleting,
  isSettingDefault,
}: AddressCardProps) {
  return (
    <Card className="address-card">
      <CardContent className="flex flex-col gap-3">
        <div className="address-card-top">
          <div className="flex items-start gap-2.5">
            <div className="address-card-icon-wrap">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <p className="address-card-name">{address.fullName}</p>
              <p className="address-card-lines">
                {address.address}, {address.city}, {address.state} {address.postalCode},{" "}
                {address.country}
              </p>
            </div>
          </div>
          {address.isDefault && <Badge className="shrink-0">Default</Badge>}
        </div>

        <div className="address-card-actions">
          {!address.isDefault && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onSetDefault(address._id)}
              className="address-card-action-button cursor-pointer"
              disabled={isSettingDefault}
            >
              <Star className="h-3.5 w-3.5" />
              {isSettingDefault ? "Setting..." : "Set as default"}
            </Button>
          )}
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Edit address"
            className="address-card-action-button cursor-pointer"
            onClick={() => onEdit(address)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Delete address"
            className="address-card-delete-button cursor-pointer"
            onClick={() => onDelete(address)}
            disabled={isDeleting}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default AddressCard;
