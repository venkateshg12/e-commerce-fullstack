import { ORDER_STATUS_META } from "@/lib/orderStatus";
import type { DashboardResponse } from "@/types";

type StatusBreakdownProps = {
  breakdown: DashboardResponse["statusBreakdown"];
};

// Orders by status as a horizontal bar list: one hue (this is magnitude, not identity), the status
// named in text beside each bar, and the count at the bar's tip.
const StatusBreakdown = ({ breakdown }: StatusBreakdownProps) => {
  const total = breakdown.reduce((sum, row) => sum + row.count, 0);
  const max = Math.max(...breakdown.map((row) => row.count), 0);

  return (
    <div className="dash-card">
      <div className="dash-card-head">
        <div>
          <p className="dash-card-title">Orders by status</p>
          <p className="dash-card-subtitle">
            {total} {total === 1 ? "order" : "orders"} placed in this period
          </p>
        </div>
      </div>

      {total === 0 ? (
        <p className="dash-empty">No orders in this period</p>
      ) : (
        <ul className="dash-bar-list">
          {breakdown.map((row) => {
            const share = total ? Math.round((row.count / total) * 100) : 0;
            return (
              <li
                key={row.status}
                className="dash-bar-row"
                title={`${ORDER_STATUS_META[row.status].label}: ${row.count} (${share}%)`}
              >
                <span className="dash-bar-label">{ORDER_STATUS_META[row.status].label}</span>
                <span className="dash-bar-track">
                  <span
                    className="dash-bar-fill block"
                    style={{ width: max ? `${(row.count / max) * 100}%` : "0%" }}
                  />
                </span>
                <span className="dash-bar-value">{row.count}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default StatusBreakdown;
