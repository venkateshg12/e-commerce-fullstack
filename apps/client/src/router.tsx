import { createBrowserRouter } from "react-router-dom";
import UserLayout from "./components/layout/UserLayout";
import LandingPage from "./pages/LandingPage";
import PublicRoute from "./components/auth/PublicRoute";
import VerifyEmail from "./pages/auth/VerifyEmail";
import ResetPassword from "./pages/auth/ResetPassword";
import HomePage from "./pages/user/HomePage";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import RoleGuardLayout from "./components/layout/RoleGuardLayout";
import AdminLayout from "./components/layout/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminPromo from "./pages/admin/AdminPromo";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminSettings from "./pages/admin/AdminSettings";
import Collections from "./pages/Collections";
import ProductDetails from "./pages/ProductDetails";
import Account from "./pages/Account";
import CollectionDetails from "./pages/CollectionDetails";


export const router = createBrowserRouter([

    {
        path: "/",
        element: <UserLayout />,
        children: [
            // 1. Shared Routes (Accessible to everyone, logged in or not — no guard)
            {
                index: true,
                element: <LandingPage />
            },
            {
                path: "collections",
                element: <Collections />
            },
            {
                path: "collections/:id",
                element: <ProductDetails />
            },
            {
                path: "collections/:id",
                element: <CollectionDetails />
            },

            // 2. Guest-Only Routes (Redirects to /home if user IS logged in)
            {
                element: <PublicRoute />,
                children: [
                    {
                        path: "login",
                        element: <LandingPage showAuth="login" />,
                    },
                    {
                        path: "register",
                        element: <LandingPage showAuth="register" />,
                    },
                    {
                        path: "password/forgot",
                        element: <LandingPage showAuth="forgot" />,
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
                        path: "home",
                        element: <HomePage />
                    }

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