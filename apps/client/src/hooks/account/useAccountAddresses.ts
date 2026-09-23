import { useState } from "react";
import type { Address, AlertType } from "@/types";
import type { AddressSchema } from "@repo/types";
import { useGetAddresses } from "./useGetAddresses";
import { useCreateAddress } from "./useCreateAddress";
import { useUpdateAddress } from "./useUpdateAddress";
import { useDeleteAddress } from "./useDeleteAddress";

export type AccountAlertPopupState = {
    isOpen: boolean;
    type: AlertType;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
};

export function useAccountAddresses() {
    const [addressDialogOpen, setAddressDialogOpen] = useState(false);
    const [editingAddress, setEditingAddress] = useState<Address | null>(null);
    const [deletingAddressId, setDeletingAddressId] = useState("");
    const [settingDefaultId, setSettingDefaultId] = useState("");
    const [alertPopup, setAlertPopup] = useState<AccountAlertPopupState | null>(null);

    const { data: addressesResponse, isLoading, isError } = useGetAddresses();
    const createMutation = useCreateAddress();
    const updateMutation = useUpdateAddress();
    const deleteMutation = useDeleteAddress();

    const addresses = addressesResponse?.data ?? [];

    function openCreateDialog() {
        setEditingAddress(null);
        setAddressDialogOpen(true);
    }

    function openEditDialog(address: Address) {
        setEditingAddress(address);
        setAddressDialogOpen(true);
    }

    function closeAddressDialog() {
        setAddressDialogOpen(false);
        setEditingAddress(null);
    }

    async function saveAddress(values: AddressSchema) {
        try {
            if (editingAddress) {
                await updateMutation.mutateAsync({ addressId: editingAddress._id, payload: values });
            } else {
                await createMutation.mutateAsync(values);
            }
            closeAddressDialog();
            setAlertPopup({
                isOpen: true,
                type: "success",
                title: editingAddress ? "Address updated" : "Address added",
                description: "Your address book has been updated.",
            });
        } catch (error: any) {
            setAlertPopup({
                isOpen: true,
                type: "error",
                title: "Save failed",
                description: error?.message || "Failed to save this address.",
            });
        }
    }

    function promptDeleteAddress(address: Address) {
        setAlertPopup({
            isOpen: true,
            type: "warning",
            title: "Delete address",
            description: `Are you sure you want to delete "${address.fullName}"? This action cannot be undone.`,
            actionLabel: "Delete",
            onAction: () => executeDeleteAddress(address._id),
        });
    }

    async function executeDeleteAddress(addressId: string) {
        try {
            setDeletingAddressId(addressId);
            await deleteMutation.mutateAsync(addressId);
            setAlertPopup({
                isOpen: true,
                type: "success",
                title: "Address deleted",
                description: "The address has been removed from your account.",
            });
        } catch (error: any) {
            setAlertPopup({
                isOpen: true,
                type: "error",
                title: "Delete failed",
                description: error?.message || "Failed to delete this address.",
            });
        } finally {
            setDeletingAddressId("");
        }
    }

    async function setDefaultAddress(addressId: string) {
        try {
            setSettingDefaultId(addressId);
            await updateMutation.mutateAsync({ addressId, payload: { isDefault: true } });
        } catch (error: any) {
            setAlertPopup({
                isOpen: true,
                type: "error",
                title: "Update failed",
                description: error?.message || "Failed to set this address as default.",
            });
        } finally {
            setSettingDefaultId("");
        }
    }

    return {
        addresses,
        loading: isLoading,
        isError,

        addressDialogOpen,
        setAddressDialogOpen,
        editingAddress,
        openCreateDialog,
        openEditDialog,
        closeAddressDialog,
        saveAddress,
        saving: createMutation.isPending || updateMutation.isPending,

        promptDeleteAddress,
        deletingAddressId,

        setDefaultAddress,
        settingDefaultId,

        alertPopup,
        setAlertPopup,
    };
}

export default useAccountAddresses;
