import { IS_DEV } from "@/constants/env";
import { useAuthStore } from "./auth.store";
import { useProductStore } from "./product.store";
import { usePromoStore } from "./promo.store";

export { useAuthStore, useProductStore, usePromoStore };

// Central Store Registry for development environment browser inspection
if (IS_DEV) {
  const stores: Record<string, unknown> = {
    useAuthStore,
    useProductStore,
    usePromoStore,
  };

  (window as any).stores = stores;

  Object.entries(stores).forEach(([name, store]) => {
    (window as any)[name] = store;
  });
}
