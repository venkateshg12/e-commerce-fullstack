import { COLOR_MAP } from "@/constants/constant";
import type { OrderItem } from "@/types";
import { ImageIcon } from "lucide-react";
import { Link } from "react-router-dom";

// One purchased line of an order. Shared by the customer's orders page and the admin order sheet.
const OrderLine = ({ item }: { item: OrderItem }) => {
  // A deleted product keeps its line (the customer really bought it) but has nothing to link to.
  const isAvailable = item.productId !== null && item.title !== null;

  const thumbnail = item.image ? (
    <img src={item.image} alt={item.title ?? "Product"} className="order-item-image" loading="lazy" />
  ) : (
    <div className="order-item-image-fallback">
      <ImageIcon className="h-5 w-5" />
    </div>
  );

  return (
    <div className="order-item">
      {isAvailable ? (
        <Link to={`/collections/${item.productId}`} className="order-item-media">
          {thumbnail}
        </Link>
      ) : (
        <div className="order-item-media">{thumbnail}</div>
      )}

      <div className="order-item-body">
        {item.brand ? <p className="order-item-brand">{item.brand}</p> : null}

        {isAvailable ? (
          <Link to={`/collections/${item.productId}`} className="order-item-title">
            {item.title}
          </Link>
        ) : (
          <p className="order-item-unavailable">Product no longer available</p>
        )}

        <div className="order-item-meta">
          {item.color ? (
            <span
              className="cart-line-swatch"
              style={{ backgroundColor: COLOR_MAP[item.color.toLowerCase()] || item.color }}
              title={item.color}
              role="img"
              aria-label={`Colour ${item.color}`}
            />
          ) : null}
          {item.size ? <span className="cart-line-pill">Size: {item.size}</span> : null}
          <span className="order-item-qty">Qty: {item.quantity}</span>
        </div>
      </div>

      <span className="order-item-price">₹{item.itemTotal.toFixed(2)}</span>
    </div>
  );
};

export default OrderLine;
