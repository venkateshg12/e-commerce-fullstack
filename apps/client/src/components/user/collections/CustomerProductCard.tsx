import { Link } from "react-router-dom";
import { ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { COLOR_MAP } from "@/constants/constant";
import type { CustomerProduct, ProductImage } from "@/types";

// How many swatches fit on a card before the rest collapse into a "+N" chip.
const MAX_VISIBLE_COLORS = 4;

const getCoverImageUrl = (images?: ProductImage[]) => {
  if (!images?.length) return null;
  return images.find((image) => image?.isCover)?.url || images[0]?.url || null;
};

type CustomerProductCardProps = {
  product: CustomerProduct;
};

const CustomerProductCard = ({ product }: CustomerProductCardProps) => {
  const coverUrl = getCoverImageUrl(product?.images);
  const salePercentage = Number(product?.salesPercentage) || 0;
  const hasSale = salePercentage > 0;
  const originalPrice = Number(product?.price) || 0;
  const finalPrice = hasSale
    ? originalPrice - (originalPrice * salePercentage) / 100
    : originalPrice;

  const colors = (product?.colors ?? []).filter(Boolean);
  const visibleColors = colors.slice(0, MAX_VISIBLE_COLORS);
  const hiddenColorCount = colors.length - visibleColors.length;

  return (
    <Card className="product-card">
      <Link to={`/collections/${product._id}`}>
        <div className="product-card-media">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={product.title}
              className="product-card-image"
              loading="lazy"
            />
          ) : (
            <div className="product-card-image-fallback">
              <ImageIcon className="h-8 w-8" />
            </div>
          )}

          {hasSale ? (
            <Badge className="product-card-sale-badge">
              -{salePercentage}%
            </Badge>
          ) : null}
        </div>

        <div className="product-card-body">
          <p className="product-card-brand">{product.brand}</p>
          <p className="product-card-title">{product.title}</p>

          {colors.length ? (
            <div className="product-card-colors">
              {visibleColors.map((color) => (
                <span
                  key={color}
                  className="product-card-color-dot"
                  style={{
                    backgroundColor: COLOR_MAP[String(color).toLowerCase()] || color,
                  }}
                  title={color}
                />
              ))}

              {hiddenColorCount > 0 ? (
                <span className="product-card-color-more">{hiddenColorCount}+</span>
              ) : null}
            </div>
          ) : null}

          <div className="product-card-price-row">
            <span className="product-card-price">₹{finalPrice.toFixed(2)}</span>

            {hasSale ? (
              <span className="product-card-original-price">
                ₹{originalPrice.toFixed(2)}
              </span>
            ) : null}
          </div>

          {product.stock <= 0 ? (
            <p className="product-card-out-of-stock">Out of stock</p>
          ) : null}
        </div>
      </Link>
    </Card>
  );
};

export default CustomerProductCard;
