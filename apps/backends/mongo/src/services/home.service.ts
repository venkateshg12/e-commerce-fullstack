import { BannerModel } from "../models/banner.model";
import CategoryModel from "../models/category.model";
import ProductModel from "../models/product.model";
import { PromoModel } from "../models/promo.model";

export const getHomeFeedService = async () => {
    const now = new Date();

    const [banners, categories, recentProducts, promos] = await Promise.all([
        BannerModel.find().sort({ createdAt: -1 }).limit(6).lean(),
        CategoryModel.find().sort({ name: 1 }).lean(),
        ProductModel.find({ status: "active" })
            .select("title brand price salesPercentage images variants createdAt")
            .populate<{ brand: { name: string } | null }>("brand", "name")
            .sort({ createdAt: -1 })
            .limit(4)
            .lean(),
        PromoModel.find({
            startsAt: { $lte: now },
            endsAt: { $gte: now },
            count: { $gt: 0 },
        })
            .sort({ createdAt: -1 })
            .limit(4)
            .lean(),
    ]);

    return {
        banners: banners.map((bannerItem) => ({
            _id: String(bannerItem._id),
            imageUrl: bannerItem.imageUrl,
            createdAt: bannerItem.createdAt.toISOString(),
        })),
        categories: categories.map((categoryItem) => ({
            _id: String(categoryItem._id),
            name: categoryItem.name,
        })),
        recentProducts: recentProducts.map((recentProductItem) => {
            const image =
                recentProductItem.images.find((item) => item.isCover)?.url ||
                recentProductItem.images[0]?.url ||
                "";

            const finalPrice = recentProductItem.salesPercentage
                ? Math.round(
                      recentProductItem.price -
                          (recentProductItem.price * recentProductItem.salesPercentage) /
                              100
                  )
                : recentProductItem.price;

            return {
                _id: String(recentProductItem._id),
                title: recentProductItem.title,
                brand: recentProductItem.brand?.name ?? "",
                image,
                price: recentProductItem.price,
                finalPrice,
                salePercentage: recentProductItem.salesPercentage,
                // Summed here rather than sent as rows: the rail only needs to know whether the
                // product can be bought at all.
                totalStock: (recentProductItem.variants ?? []).reduce(
                    (sum, variant) => sum + (variant.stock || 0),
                    0
                ),
                createdAt: recentProductItem.createdAt.toISOString(),
            };
        }),
        coupons: promos.map((promoItem) => ({
            _id: String(promoItem._id),
            code: promoItem.code,
            percentage: promoItem.percentage,
            count: promoItem.count,
            minimumOrderValue: promoItem.minimumOrderValue,
            endsAt: promoItem.endsAt.toISOString(),
        })),
    };
};
