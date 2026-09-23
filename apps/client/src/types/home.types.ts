// Shapes returned by the public GET /home feed (apps/backends/mongo/src/services/home.service.ts).

export type HomeBanner = {
    _id: string;
    imageUrl: string;
    createdAt: string;
};

export type HomeCategory = {
    _id: string;
    name: string;
};

// A flattened product: brand is already a name and there is one cover image, which is why the
// home cards can't reuse CustomerProductCard (it expects the full catalogue shape).
export type HomeProduct = {
    _id: string;
    title: string;
    brand: string;
    image: string;
    price: number;
    finalPrice: number;
    // The service renames the model's `salesPercentage` to this — kept as the API sends it.
    salePercentage: number;
    // 0 when every colour and size is sold out.
    totalStock: number;
    createdAt: string;
};

export type HomeCoupon = {
    _id: string;
    code: string;
    percentage: number;
    count: number;
    minimumOrderValue: number;
    endsAt: string;
};

export type HomeFeedResponse = {
    banners: HomeBanner[];
    categories: HomeCategory[];
    recentProducts: HomeProduct[];
    coupons: HomeCoupon[];
};
