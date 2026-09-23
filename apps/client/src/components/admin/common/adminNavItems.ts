import type { NavItem } from "@/types";
import { BadgePercent, BarChart3, Images, LayoutDashboard, Package, Settings2 } from "lucide-react";

// The admin destinations, in their own module so both the desktop rail and the phone drawer read
// one list — and so neither component file exports a non-component (which breaks Fast Refresh).
export const adminNavItems: NavItem[] = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Products", href: "/admin/products", icon: Package },
    { label: "Promos", href: "/admin/promos", icon: BadgePercent },
    { label: "Orders", href: "/admin/orders", icon: BarChart3 },
    { label: "Banners", href: "/admin/banners", icon: Images },
    { label: "Settings", href: "/admin/settings", icon: Settings2 },
];
