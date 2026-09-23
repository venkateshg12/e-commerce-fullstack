import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Address } from "@/types";
import { MapPinOff, Plus } from "lucide-react";
import AddressCard from "./AddressCard";

type AddressListProps = {
  addresses: Address[];
  loading: boolean;
  onEdit: (address: Address) => void;
  onDelete: (address: Address) => void;
  onSetDefault: (addressId: string) => void;
  deletingAddressId: string;
  settingDefaultId: string;
  onAddAddress: () => void;
};

function AddressList({
  addresses,
  loading,
  onEdit,
  onDelete,
  onSetDefault,
  deletingAddressId,
  settingDefaultId,
  onAddAddress,
}: AddressListProps) {
  if (loading) {
    return (
      <div className="account-addresses-grid">
        <Skeleton className="h-36 w-full rounded-2xl" />
        <Skeleton className="h-36 w-full rounded-2xl" />
      </div>
    );
  }

  if (addresses.length === 0) {
    return (
      <Card className="empty-card">
        <CardContent className="empty-card-content">
          <MapPinOff className="h-8 w-8 text-muted-foreground" />
          <p className="empty-title">No saved addresses yet</p>
          <Button size="sm" onClick={onAddAddress} className="cursor-pointer">
            <Plus className="h-3.5 w-3.5" /> Add address
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="account-addresses-grid">
      {addresses.map((address) => (
        <AddressCard
          key={address._id}
          address={address}
          onEdit={onEdit}
          onDelete={onDelete}
          onSetDefault={onSetDefault}
          isDeleting={deletingAddressId === address._id}
          isSettingDefault={settingDefaultId === address._id}
        />
      ))}
    </div>
  );
}

export default AddressList;
