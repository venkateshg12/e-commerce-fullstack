import { Suspense, useEffect, useLayoutEffect } from "react";
import { Outlet } from "react-router-dom";
import CategoryPills from "../user/common/CategoryPills";
import SiteFooter from "../user/common/SiteFooter";
import UserDesktopNavbar from "../user/common/UserDesktopNavbar";
import RouteFallback from "../common/RouteFallback";
import { preloadCustomerPages } from "@/pages/lazyPages";

const UserLayout = () => {
  // The storefront look (storefront.css) hangs off a class on <html>, not on this wrapper, so the
  // portalled bits — login modal, dialogs, sheets, dropdowns — pick it up too. The admin layout
  // never sets it, so the admin panel keeps its own look.
  useLayoutEffect(() => {
    document.documentElement.classList.add("storefront");
    return () => document.documentElement.classList.remove("storefront");
  }, []);

  useEffect(() => {
    // requestIdleCallback is missing in Safari, where a short timeout does the same job.
    const idle = window.requestIdleCallback ?? ((callback: () => void) => window.setTimeout(callback, 1500));
    idle(preloadCustomerPages);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <UserDesktopNavbar />
      <CategoryPills />
      <main className="flex-1 w-full">
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
};

export default UserLayout;
