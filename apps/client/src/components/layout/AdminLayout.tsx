import { Outlet } from "react-router-dom";
import AdminMobileNav from "../admin/common/AdminMobileNav";
import AdminSidebar from "../admin/common/AdminSidebar";
import UserAvatarMenu from "../common/UserAvatarMenu";

const AdminLayout = () => {
  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 h-16 z-30 flex items-center justify-between gap-2 border-b px-3 backdrop-blur sm:h-18 sm:px-4 lg:px-6 bg-background/80">
          {/* The rail disappears below lg, so the drawer is the only way around on a phone. */}
          <AdminMobileNav />
          <div className="truncate text-sm font-medium text-muted-foreground">
            Admin Workspace
          </div>
          <div className="ml-auto flex items-center gap-3">
            <UserAvatarMenu accountHref="/admin/settings" accountLabel="Manage Account" align="end" />
          </div>
        </header>
        <main className="flex-1 p-3 sm:p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

