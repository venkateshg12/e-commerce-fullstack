import { Skeleton } from "@/components/ui/skeleton";
import LowStock from "@/components/admin/dashboard/LowStock";
import RecentOrders from "@/components/admin/dashboard/RecentOrders";
import RevenueChart from "@/components/admin/dashboard/RevenueChart";
import StatTile from "@/components/admin/dashboard/StatTile";
import StatusBreakdown from "@/components/admin/dashboard/StatusBreakdown";
import TopProducts from "@/components/admin/dashboard/TopProducts";
import { useGetDashboard } from "@/hooks/dashboard/useGetDashboard";
import { formatRupees } from "@/lib/orderStatus";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { DASHBOARD_RANGES } from "@repo/types";
import { IndianRupee, Receipt, ShoppingBag, Users } from "lucide-react";
import { useState } from "react";

const formatCount = (value: number) => new Intl.NumberFormat("en-IN").format(value);

const AdminDashboard = () => {
  const user = useAuthStore((state) => state.user);
  const [days, setDays] = useState<number>(30);
  const { data, isPending, isError, isPlaceholderData } = useGetDashboard(days);

  const dashboard = data?.data;
  const comparisonLabel = `vs previous ${days} days`;
  const firstName = user?.name?.split(" ")[0];

  return (
    <div className="dash-page">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">{firstName ? `Welcome back, ${firstName}` : "Dashboard"}</h1>
          <p className="dash-subtitle">How the store is doing over the last {days} days.</p>
        </div>

        {/* The one filter, above everything it scopes. */}
        <div className="dash-range" role="group" aria-label="Date range">
          {DASHBOARD_RANGES.map((range) => (
            <button
              key={range}
              type="button"
              aria-pressed={days === range}
              className={cn("dash-range-option", days === range && "dash-range-option-active")}
              onClick={() => setDays(range)}
            >
              Last {range} days
            </button>
          ))}
        </div>
      </div>

      {isPending ? (
        <>
          <div className="dash-kpi-grid">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={`kpi-skeleton-${index}`} className="h-40 rounded-xl" />
            ))}
          </div>
          <div className="dash-grid-main">
            <Skeleton className="h-96 rounded-xl" />
            <Skeleton className="h-96 rounded-xl" />
          </div>
        </>
      ) : isError || !dashboard ? (
        <div className="dash-card">
          <p className="dash-empty">Couldn't load the dashboard. Please refresh and try again.</p>
        </div>
      ) : (
        // A new range keeps the current figures on screen, dimmed, until its numbers arrive.
        <div className={cn("space-y-4", isPlaceholderData && "dash-refreshing")} aria-busy={isPlaceholderData}>
          <div className="dash-kpi-grid">
            <StatTile
              label="Revenue"
              icon={IndianRupee}
              comparison={dashboard.kpis.revenue}
              format={(value) => formatRupees(value, value >= 100000)}
              comparisonLabel={comparisonLabel}
              trend={dashboard.revenueSeries.map((point) => point.revenue)}
            />
            <StatTile
              label="Paid orders"
              icon={ShoppingBag}
              comparison={dashboard.kpis.orders}
              format={formatCount}
              comparisonLabel={comparisonLabel}
              trend={dashboard.revenueSeries.map((point) => point.orders)}
            />
            <StatTile
              label="Average order value"
              icon={Receipt}
              comparison={dashboard.kpis.averageOrderValue}
              format={(value) => formatRupees(value)}
              comparisonLabel={comparisonLabel}
            />
            <StatTile
              label="New customers"
              icon={Users}
              comparison={dashboard.kpis.newCustomers}
              format={formatCount}
              comparisonLabel={comparisonLabel}
              note={`${formatCount(dashboard.kpis.totalCustomers)} customers in total`}
            />
          </div>

          <div className="dash-grid-main">
            <div className="dash-card">
              <div className="dash-card-head">
                <div>
                  <p className="dash-card-title">Revenue</p>
                  <p className="dash-card-subtitle">Paid orders per day, by the date they were paid</p>
                </div>
              </div>
              <RevenueChart series={dashboard.revenueSeries} />
            </div>

            <StatusBreakdown breakdown={dashboard.statusBreakdown} />
          </div>

          <div className="dash-grid-secondary">
            <RecentOrders orders={dashboard.recentOrders} />
            <TopProducts products={dashboard.topProducts} />
          </div>

          <LowStock products={dashboard.lowStock} threshold={dashboard.lowStockThreshold} />
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
