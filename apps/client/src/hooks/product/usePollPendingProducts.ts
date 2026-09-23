import { getProductsById } from "@/api/product";
import queryClient from "@/lib/queryClient";
import { useProductStore } from "@/store/product.store";
import { useEffect } from "react";

export const usePollPendingProducts = (intervalMs: number = 15000) => {
    const pendingIds = useProductStore((state) => state.pendingImageProductIds);

    useEffect(() => {
        if (pendingIds.length === 0) return;

        const checkPendingProducts = async () => {
            const currentPendingIds = useProductStore.getState().pendingImageProductIds;
            if (currentPendingIds.length === 0) return;

            for (const id of currentPendingIds) {
                try {
                    const response = await getProductsById(id);
                    const product = response?.data;

                    if (product) {
                        const hasImages = product.images && product.images.length > 0;
                        const isFinished = product.uploadStatus === "READY" || product.uploadStatus === "FAILED";

                        if (hasImages || isFinished) {
                            const store = useProductStore.getState();
                            store.updateProductInStore(product);
                            store.removePendingImageProductId(id);

                            // Update React Query cache so any component observing admin-products updates immediately
                            queryClient.setQueriesData(
                                { queryKey: ["admin-products"] },
                                (oldData: any) => {
                                    if (!oldData || !oldData.data) return oldData;
                                    return {
                                        ...oldData,
                                        data: oldData.data.map((p: any) => (p._id === product._id ? product : p)),
                                    };
                                }
                            );
                            queryClient.invalidateQueries({ queryKey: ["admin-products"] });
                        }
                    }
                } catch (err) {
                    console.error(`[PollPendingProducts] Error checking product ${id}:`, err);
                }
            }
        };

        // Initial check immediately on mount or pendingIds change
        checkPendingProducts();

        // Setup interval for targeted checking
        const intervalId = setInterval(checkPendingProducts, intervalMs);

        return () => clearInterval(intervalId);
    }, [pendingIds, intervalMs]);
};

