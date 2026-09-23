import { createBrowserRouter, Navigate } from "react-router-dom";
import UserLayout from "./components/layout/UserLayout";
import Home from "./pages/Home";
import PublicRoute from "./components/auth/PublicRoute";
import VerifyEmail from "./pages/auth/VerifyEmail";
import ResetPassword from "./pages/auth/ResetPassword";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import RoleGuardLayout from "./components/layout/RoleGuardLayout";
import AdminLayout from "./components/layout/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminPromo from "./pages/admin/AdminPromo";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminBanners from "./pages/admin/AdminBanners";
import AdminSettings from "./pages/admin/AdminSettings";
import Collections from "./pages/Collections";
import ProductDetails from "./pages/ProductDetails";
import Account from "./pages/Account";
import Wishlist from "./pages/Wishlist";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderSuccess from "./pages/OrderSuccess";
import Orders from "./pages/Orders";


export const router = createBrowserRouter([

    {
        path: "/",
        element: <UserLayout />,
        children: [
            // 1. Shared Routes (Accessible to everyone, logged in or not — no guard)
            // One home page for guests and signed-in customers alike.
            {
                index: true,
                element: <Home />
            },
            // The old customer landing route — kept so existing links and bookmarks still land.
            {
                path: "home",
                element: <Navigate to="/" replace />
            },
            {
                path: "collections",
                element: <Collections />
            },
            {
                path: "collections/:id",
                element: <ProductDetails />
            },

            // 2. Guest-Only Routes (Redirects to / if user IS logged in). The auth forms open as modals
            //    over the home page.
            {
                element: <PublicRoute />,
                children: [
                    {
                        path: "login",
                        element: <Home showAuth="login" />,
                    },
                    {
                        path: "register",
                        element: <Home showAuth="register" />,
                    },
                    {
                        path: "password/forgot",
                        element: <Home showAuth="forgot" />,
                    },
                    {
                        path: "auth/verify/:token",
                        element: <VerifyEmail />,
                    },
                    {
                        path: "password/reset/:token",
                        element: <ResetPassword />,
                    },
                ],
            },

            // 3. Protected Customer Routes (Redirects to /login if NOT logged in)
            {
                element: <ProtectedRoute />,
                children: [
                    {
                        path: "account",
                        element: <Account />,
                    },
                    {
                        path: "wishlist",
                        element: <Wishlist />,
                    },
                    {
                        path: "cart",
                        element: <Cart />,
                    },
                    {
                        path: "checkout",
                        element: <Checkout />,
                    },
                    {
                        path: "order-success",
                        element: <OrderSuccess />,
                    },
                    {
                        path: "orders",
                        element: <Orders />,
                    },

                ],
            },
        ],
    },

    // 4. Protected Admin Routes (Requires login AND admin role)
    {
        element: <ProtectedRoute />,
        children: [
            {
                element: <RoleGuardLayout allow={["admin"]} />,
                children: [
                    {
                        path: "/admin",
                        element: <AdminLayout />,
                        children: [
                            {
                                index: true,
                                element: <AdminDashboard />,
                            },
                            {
                                path: 'products',
                                element: <AdminProducts />,
                            },
                            {
                                path: 'promos',
                                element: <AdminPromo />
                            },
                            {
                                path: 'orders',
                                element: <AdminOrders />
                            },
                            {
                                path: 'banners',
                                element: <AdminBanners />
                            },
                            {
                                path: 'settings',
                                element: <AdminSettings />
                            }
                        ],
                    },
                ],
            },
        ],
    },

])