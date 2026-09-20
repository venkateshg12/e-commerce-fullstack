import type { Promo } from "@/types/promo.types";
import { create } from "zustand";
import { devtools } from "zustand/middleware";

export interface PromoStore {
  promos: Promo[];
  editingPromo: Promo | null;

  setPromos: (promos: Promo[]) => void;
  addPromo: (promo: Promo) => void;
  updatePromoInStore: (promo: Promo) => void;
  deletePromoFromStore: (promoId: string) => void;
  setEditingPromo: (promo: Promo | null) => void;
}

export const usePromoStore = create<PromoStore>()(
  devtools(
    (set) => ({
      promos: [],
      editingPromo: null,

      setPromos: (promos) =>
        set({ promos }, false, "setPromos"),

      addPromo: (promo) =>
        set(
          (state) => ({
            promos: [promo, ...state.promos.filter((p) => p._id !== promo._id)],
          }),
          false,
          "addPromo"
        ),

      updatePromoInStore: (updatedPromo) =>
        set(
          (state) => ({
            promos: state.promos.map((p) =>
              p._id === updatedPromo._id ? updatedPromo : p
            ),
          }),
          false,
          "updatePromoInStore"
        ),

      deletePromoFromStore: (promoId) =>
        set(
          (state) => ({
            promos: state.promos.filter((p) => p._id !== promoId),
          }),
          false,
          "deletePromoFromStore"
        ),

      setEditingPromo: (editingPromo) =>
        set({ editingPromo }, false, "setEditingPromo"),
    }),
    { name: "PromoStore" }
  )
);
