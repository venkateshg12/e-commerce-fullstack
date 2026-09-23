import { useQuery } from "@tanstack/react-query";
import { getCustomerCategories } from "@/api/collection";

// Categories with their types, from the public GET /categories. Shared by the home page and the
// collections filters so both read ONE cache entry — the one every admin category/type mutation
// invalidates. That's what makes an edit in Manage Categories show up on the storefront at once.
export const useGetCustomerCategories = () => {
    return useQuery({
        queryKey: ["customer-categories"],
        queryFn: getCustomerCategories,
        staleTime: 5 * 60 * 1000,
    });
};
