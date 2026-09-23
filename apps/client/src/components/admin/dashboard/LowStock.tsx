import type { DashboardResponse } from "@/types";
import { ImageIcon } from "lucide-react";
import { Link } from "react-router-dom";

type LowStockProps = {
  products: DashboardResponse["lowStock"];
  threshold: number;
};

// Current state, not the selected period — stock right now is what needs acting on.
const LowStock = ({ products, threshold }: LowStockProps) => {
  return (
    <div className="dash-card">
      <div className="dash-card-head">
        <div>
          <p className="dash-card-title">Low stock</p>
          <p className="dash-card-subtitle">Active products with {threshold} or fewer left, right now</p>
        </div>
        <Link to="/admin/products" className="dash-card-link">
          Restock
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="dash-empty">Every active product has more than {threshold} in stock</p>
      ) : (
        <ul className="dash-list">
          {products.map((product) => (
            <li key={product.productId} className="dash-product-row">
              <span className="dash-product-thumb">
                {product.image ? (
                  <img src={product.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <ImageIcon className="h-4 w-4" />
                  </span>
                )}
              </span>
              <span className="dash-product-name min-w-0 flex-1">{product.title}</span>
              {/* Stated in words, not just a warning colour. */}
              {product.stock === 0 ? (
                <span className="dash-stock-out">Out of stock</span>
              ) : (
                <span className="dash-stock-low">{product.stock} left</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LowStock;
