// Every route except the landing page loads its code on first visit, so a cold first paint
// downloads far less JavaScript. The layouts wrap their <Outlet /> in <Suspense> while a chunk loads.
// Kept in a .ts file so router.tsx stays free of component declarations (react-refresh lint rule).
import { lazy } from "react";

export const VerifyEmail = lazy(() => import("./auth/VerifyEmail"));
export const ResetPassword = lazy(() => import("./auth/ResetPassword"));
export const AdminDashboard = lazy(() => import("./admin/AdminDashboard"));
export const AdminProducts = lazy(() => import("./admin/AdminProducts"));
export const AdminPromo = lazy(() => import("./admin/AdminPromo"));
export const AdminOrders = lazy(() => import("./admin/AdminOrders"));
export const AdminBanners = lazy(() => import("./admin/AdminBanners"));
export const AdminSettings = lazy(() => import("./admin/AdminSettings"));
export const Collections = lazy(() => import("./Collections"));
export const ProductDetails = lazy(() => import("./ProductDetails"));
export const Account = lazy(() => import("./Account"));
export const Wishlist = lazy(() => import("./Wishlist"));
export const Cart = lazy(() => import("./Cart"));
export const Checkout = lazy(() => import("./Checkout"));
export const OrderSuccess = lazy(() => import("./OrderSuccess"));
export const Orders = lazy(() => import("./Orders"));
