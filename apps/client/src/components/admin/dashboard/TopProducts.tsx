import { formatRupees } from "@/lib/orderStatus";
import type { DashboardResponse } from "@/types";
import { ImageIcon } from "lucide-react";
import { Link } from "react-router-dom";

type TopProductsProps = {
  products: DashboardResponse["topProducts"];
};

// Best sellers by revenue. The thin bar under each name is its revenue against the top seller's.
const TopProducts = ({ products }: TopProductsProps) => {
  const topRevenue = products[0]?.revenue ?? 0;

  return (
    <div className="dash-card">
      <div className="dash-card-head">
        <div>
          <p className="dash-card-title">Top products</p>
          <p className="dash-card-subtitle">By revenue from paid orders</p>
        </div>
        <Link to="/admin/products" className="dash-card-link">
          Manage
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="dash-empty">No sales in this period</p>
      ) : (
        <ul className="dash-list">
          {products.map((product, index) => (
            <li key={product.productId} className="dash-product-row">
              <span className="w-4 shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                {index + 1}
              </span>
              <span className="dash-product-thumb">
                {product.image ? (
                  <img src={product.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <ImageIcon className="h-4 w-4" />
                  </span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="dash-product-name block">
                  {product.title ?? "Deleted product"}
                </span>
                <span className="dash-product-meta block">{product.units} sold</span>
                <span className="dash-product-bar block">
                  <span
                    className="dash-bar-fill block"
                    style={{ width: topRevenue ? `${(product.revenue / topRevenue) * 100}%` : "0%" }}
                  />
                </span>
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                {formatRupees(product.revenue)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TopProducts;
