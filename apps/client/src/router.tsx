import { createBrowserRouter, Navigate } from "react-router-dom";
import UserLayout from "./components/layout/UserLayout";
import Home from "./pages/Home";
import PublicRoute from "./components/auth/PublicRoute";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import RoleGuardLayout from "./components/layout/RoleGuardLayout";
import AdminLayout from "./components/layout/AdminLayout";
import {
    VerifyEmail,
    ResetPassword,
    AdminDashboard,
    AdminProducts,
    AdminPromo,
    AdminOrders,
    AdminBanners,
    AdminSettings,
    Collections,
    ProductDetails,
    Account,
    Wishlist,
    Cart,
    Checkout,
    OrderSuccess,
    Orders,
} from "./pages/lazyPages";




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