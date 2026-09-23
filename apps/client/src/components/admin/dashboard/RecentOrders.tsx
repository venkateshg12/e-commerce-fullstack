import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_META, formatOrderDate, formatRupees } from "@/lib/orderStatus";
import type { DashboardResponse } from "@/types";
import { Link } from "react-router-dom";

type RecentOrdersProps = {
  orders: DashboardResponse["recentOrders"];
};

const RecentOrders = ({ orders }: RecentOrdersProps) => {
  return (
    <div className="dash-card">
      <div className="dash-card-head">
        <div>
          <p className="dash-card-title">Recent orders</p>
          <p className="dash-card-subtitle">The latest orders placed in this period</p>
        </div>
        <Link to="/admin/orders" className="dash-card-link">
          View all
        </Link>
      </div>

      {orders.length === 0 ? (
        <p className="dash-empty">No orders in this period</p>
      ) : (
        <ul className="dash-list">
          {orders.map((order) => (
            <li key={order._id} className="dash-recent-row">
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">#{order.code}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {order.customerName || order.customerEmail} · {formatOrderDate(order.createdAt)}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  {formatRupees(order.totalAmount)}
                </span>
                <Badge variant={ORDER_STATUS_META[order.orderStatus].variant}>
                  {ORDER_STATUS_META[order.orderStatus].label}
                </Badge>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default RecentOrders;
