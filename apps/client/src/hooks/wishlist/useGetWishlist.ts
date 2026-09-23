import { useQuery } from "@tanstack/react-query";
import { getWishlist } from "@/api/wishlist";
import { useAuthStore } from "@/store/auth.store";

export const useGetWishlist = () => {
    const user = useAuthStore((state) => state.user);

    return useQuery({
        queryKey: ["wishlist"],
        queryFn: getWishlist,
        // Every wishlist endpoint requires auth — gating here stops a logged-out visitor from
        // firing a request that can only 401.
        enabled: Boolean(user),
        staleTime: 60 * 1000,
    });
};
