// Every route except the landing page loads its code on first visit, so a cold first paint
// downloads far less JavaScript. The layouts wrap their <Outlet /> in <Suspense> while a chunk loads.
// Kept in a .ts file so router.tsx stays free of component declarations (react-refresh lint rule).
import { lazy } from "react";

// Collections and ProductDetails are not lazy on purpose: they are the main browsing path, and a
// lazy page makes a click look dead — the router holds the old page on screen, with no fallback,
// until the new chunk arrives (seconds on a cold dev server).

export const VerifyEmail = lazy(() => import("./auth/VerifyEmail"));
export const ResetPassword = lazy(() => import("./auth/ResetPassword"));
export const AdminDashboard = lazy(() => import("./admin/AdminDashboard"));
export const AdminProducts = lazy(() => import("./admin/AdminProducts"));
export const AdminPromo = lazy(() => import("./admin/AdminPromo"));
export const AdminOrders = lazy(() => import("./admin/AdminOrders"));
export const AdminBanners = lazy(() => import("./admin/AdminBanners"));
export const AdminSettings = lazy(() => import("./admin/AdminSettings"));
export const Account = lazy(() => import("./Account"));
export const Wishlist = lazy(() => import("./Wishlist"));
export const Cart = lazy(() => import("./Cart"));
export const Checkout = lazy(() => import("./Checkout"));
export const OrderSuccess = lazy(() => import("./OrderSuccess"));
export const Orders = lazy(() => import("./Orders"));

// Warm the other customer pages once the browser is idle, so the first click on cart, orders or
// account doesn't wait on a download either. Failures are harmless: the page just loads on click.
export const preloadCustomerPages = () => {
  void Promise.allSettled([
    import("./Cart"),
    import("./Wishlist"),
    import("./Orders"),
    import("./Account"),
    import("./Checkout"),
    import("./OrderSuccess"),
  ]);
};
