import { formatDiscount } from "@/lib/price";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { HomeProduct } from "@/types";
import { ArrowRight, ImageIcon } from "lucide-react";
import { Link } from "react-router-dom";

type HomeProductGridProps = {
  products: HomeProduct[];
};

// Built from the .product-card* classes so new arrivals look exactly like the /collections grid.
const HomeProductGrid = ({ products }: HomeProductGridProps) => {
  return (
    <section>
      <div className="home-section-head">
        <div>
          <p className="home-section-eyebrow">Just in</p>
          <h2 className="home-section-title">New arrivals</h2>
        </div>
        <Link to="/collections" className="home-view-all">
          View all
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="home-product-grid">
        {products.map((product) => {
          const hasSale = product.salePercentage > 0;
          const isSoldOut = product.totalStock <= 0;

          return (
            <Card key={product._id} className="product-card">
              <Link to={`/collections/${product._id}`}>
                <div className="product-card-media">
                  {product.image ? (
                    <img
                      src={product.image}
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
                    <Badge className="product-card-sale-badge">-{formatDiscount(product.salePercentage)}%</Badge>
                  ) : null}

                  {isSoldOut ? (
                    <span className="product-card-sold-out-veil">Sold out</span>
                  ) : null}
                </div>

                <div className="product-card-body">
                  <p className="product-card-brand">{product.brand}</p>
                  <p className="product-card-title">{product.title}</p>

                  <div className="product-card-price-row">
                    <span className="product-card-price">₹{product.finalPrice.toFixed(2)}</span>
                    {hasSale ? (
                      <span className="product-card-original-price">
                        ₹{product.price.toFixed(2)}
                      </span>
                    ) : null}
                  </div>
                </div>
              </Link>
            </Card>
          );
        })}
      </div>
    </section>
  );
};

export default HomeProductGrid;
