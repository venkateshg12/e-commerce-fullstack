import { AlertPopup } from "@/components/ui/alert-popup";
import { Button } from "@/components/ui/button";
import { useAccountAddresses } from "@/hooks/account/useAccountAddresses";
import { MapPin, Plus } from "lucide-react";
import AddressDialog from "./AddressDialog";
import AddressList from "./AddressList";

function AccountAddressesTab() {
  const {
    addresses,
    loading,
    addressDialogOpen,
    setAddressDialogOpen,
    editingAddress,
    openCreateDialog,
    openEditDialog,
    closeAddressDialog,
    saveAddress,
    saving,
    promptDeleteAddress,
    deletingAddressId,
    setDefaultAddress,
    settingDefaultId,
    alertPopup,
    setAlertPopup,
  } = useAccountAddresses();

  return (
    <div className="account-section">
      <div className="account-addresses-header">
        <div className="account-addresses-title-row">
          <MapPin className="account-card-icon" />
          <h3 className="font-heading text-base font-semibold">Saved addresses</h3>
        </div>
        <Button size="sm" onClick={openCreateDialog} className="cursor-pointer">
          <Plus className="h-3.5 w-3.5" /> Add address
        </Button>
      </div>

      <AddressList
        addresses={addresses}
        loading={loading}
        onEdit={openEditDialog}
        onDelete={promptDeleteAddress}
        onSetDefault={setDefaultAddress}
        deletingAddressId={deletingAddressId}
        settingDefaultId={settingDefaultId}
        onAddAddress={openCreateDialog}
      />

      <AddressDialog
        open={addressDialogOpen}
        onOpenChange={(open) => (open ? setAddressDialogOpen(true) : closeAddressDialog())}
        address={editingAddress}
        saving={saving}
        onSave={saveAddress}
      />

      {alertPopup && (
        <AlertPopup
          {...alertPopup}
          onClose={() => setAlertPopup(null)}
        />
      )}
    </div>
  );
}

export default AccountAddressesTab;
