import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const CustomerProductCardSkeleton = () => {
  return (
    <Card className="product-card">
      <div className="product-card-media">
        <Skeleton className="product-skeleton-media" />
      </div>

      <div className="product-card-body">
        <Skeleton className="product-skeleton-brand" />
        <Skeleton className="product-skeleton-title" />
        <Skeleton className="product-skeleton-title-short" />

        <div className="product-card-colors">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton
              key={`product-skeleton-color-${index}`}
              className="product-card-color-dot"
            />
          ))}
        </div>

        <div className="product-card-price-row">
          <Skeleton className="product-skeleton-price" />
        </div>
      </div>
    </Card>
  );
};

export default CustomerProductCardSkeleton;
