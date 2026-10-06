import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import RouteFallback from "../common/RouteFallback";
import UserDesktopNavbar from "../user/common/UserDesktopNavbar";

const UserLayout = () => {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <UserDesktopNavbar />
      <main className="flex-1 w-full">
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
};

export default UserLayout;
