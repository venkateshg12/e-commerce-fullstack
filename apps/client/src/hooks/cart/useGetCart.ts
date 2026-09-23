import { useQuery } from "@tanstack/react-query";
import { getCart } from "@/api/cart";
import { useAuthStore } from "@/store/auth.store";
import type { CartResponse, FailureResponse, SuccessResponse } from "@/types";

export const useGetCart = () => {
    const user = useAuthStore((state) => state.user);

    return useQuery<SuccessResponse<CartResponse>, FailureResponse>({
        queryKey: ["cart"],
        queryFn: getCart,
        // The cart is auth-only on the backend, so gating here stops a logged-out visitor from
        // firing a request that can only 401.
        enabled: Boolean(user),
        staleTime: 60 * 1000,
    });
};
