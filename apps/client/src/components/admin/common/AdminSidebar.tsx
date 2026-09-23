import { NavLink } from "react-router-dom";
import { adminNavItems } from "./adminNavItems";

type SidebarNavProps = {
    // Closes the phone drawer once a destination is picked; the desktop rail passes nothing.
    onNavigate?: () => void;
};

export const SidebarNav = ({ onNavigate }: SidebarNavProps) => {
    return (
        <nav className="nav-wrap">
            {adminNavItems.map((item) => {
                const Icon = item.icon;
                return (
                    <NavLink
                        key={item.label}
                        to={item.href}
                        end={item.href === "/admin"}
                        onClick={onNavigate}
                        className={({ isActive }) =>
                            `nav-item-base nav-item-desktop ${isActive ? "active-item" : "idle-item"}`
                        }
                    >
                        <Icon className="h-4.5 w-4.5" />
                        <span>{item.label}</span>
                    </NavLink>
                );
            })}
        </nav>
    );
};

const AdminSidebar = () => {
    return (
        <aside className="sidebar-root">
            <div className="brand-row">
                <div className="flex items-center gap-2">
                    <img src="/logo.png" alt="logo" className="h-10 w-34" />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto py-4">
                <SidebarNav />
            </div>
        </aside>
    );
};

export default AdminSidebar;

