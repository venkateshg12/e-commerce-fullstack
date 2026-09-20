import { useMemo, useState } from "react";
import type { Promo, PromoFormValues } from "@/types/promo.types";
import queryClient from "@/lib/queryClient";
import { usePromoStore } from "@/store/promo.store";
import { useGetPromos } from "./useGetPromos";
import { useCreatePromo } from "./useCreatePromo";
import { useUpdatePromo } from "./useUpdatePromo";
import { useDeletePromo } from "./useDeletePromo";

export type AlertPopupState = {
  isOpen: boolean;
  type: "success" | "error" | "info" | "warning";
  title: string;
  description: string;
  onAction?: () => void;
  actionLabel?: string;
};

export function useAdminPromo() {
  const [search, setSearch] = useState("");
  const [promoDialogOpen, setPromoDialogOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promo | null>(null);
  const [deletingPromoId, setDeletingPromoId] = useState("");
  const [alertPopup, setAlertPopup] = useState<AlertPopupState | null>(null);

  const { data: promosResponse, isLoading: isPromosLoading, isError: isPromosError } = useGetPromos();

  const createMutation = useCreatePromo();
  const updateMutation = useUpdatePromo();
  const deleteMutation = useDeletePromo();

  const storePromos = usePromoStore((state) => state.promos);
  const promos = promosResponse?.data?.items ?? storePromos ?? [];
  const loading = isPromosLoading;
  const saving = createMutation.isPending || updateMutation.isPending;

  const refreshAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin-promos"] });
  };

  const filteredPromos = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return promos;

    return promos.filter((promo) => promo.code.toLowerCase().includes(query));
  }, [promos, search]);

  function openCreateDialog() {
    setEditingPromo(null);
    setPromoDialogOpen(true);
  }

  function closePromoDialog() {
    setEditingPromo(null);
    setPromoDialogOpen(false);
  }

  function openEditDialog(promo: Promo) {
    setEditingPromo(promo);
    setPromoDialogOpen(true);
  }

  async function savePromo(values: PromoFormValues) {
    try {
      if (editingPromo) {
        await updateMutation.mutateAsync({
          promoId: editingPromo._id,
          payload: {
            code: values.code,
            percentage: Number(values.percentage),
            count: Number(values.count),
            minimumOrderValue: Number(values.minimumOrderValue),
            startsAt: values.startsAt ? new Date(values.startsAt) : undefined,
            endsAt: values.endsAt ? new Date(values.endsAt) : undefined,
          },
        });
      } else {
        await createMutation.mutateAsync(values);
      }

      closePromoDialog();
      setAlertPopup({
        isOpen: true,
        type: "success",
        title: editingPromo ? "Promo Updated" : "Promo Created",
        description: `Promo code "${values.code}" has been saved successfully.`,
      });
    } catch (error: any) {
      console.error("Failed to save promo", error);
      setAlertPopup({
        isOpen: true,
        type: "error",
        title: "Save Failed",
        description:
          error?.response?.data?.message ||
          error?.message ||
          "Failed to save promo.",
      });
    }
  }

  function promptDeletePromo(promo: Promo) {
    setAlertPopup({
      isOpen: true,
      type: "warning",
      title: "Delete Promo",
      description: `Are you sure you want to delete promo "${promo.code}"? This action cannot be undone.`,
      actionLabel: "Delete",
      onAction: () => executeDeletePromo(promo._id),
    });
  }

  async function executeDeletePromo(promoId: string) {
    try {
      setDeletingPromoId(promoId);
      await deleteMutation.mutateAsync(promoId);
      setAlertPopup({
        isOpen: true,
        type: "success",
        title: "Promo Deleted",
        description: "Promo code has been successfully deleted.",
      });
    } catch (error: any) {
      console.error("Failed to delete promo", error);
      setAlertPopup({
        isOpen: true,
        type: "error",
        title: "Delete Failed",
        description:
          error?.response?.data?.message ||
          error?.message ||
          "Failed to delete promo.",
      });
    } finally {
      setDeletingPromoId("");
    }
  }

  return {
    search,
    setSearch,
    promos: filteredPromos,
    allPromos: promos,
    loading,
    isPromosError,
    promoDialogOpen,
    setPromoDialogOpen,
    editingPromo,
    openCreateDialog,
    closePromoDialog,
    openEditDialog,
    refreshAll,
    savePromo,
    promptDeletePromo,
    removePromo: executeDeletePromo,
    saving,
    deletingPromoId:
      deletingPromoId ||
      (deleteMutation.isPending ? (deleteMutation.variables as string) : ""),
    alertPopup,
    setAlertPopup,
  };
}

export default useAdminPromo;
