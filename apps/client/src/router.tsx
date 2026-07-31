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


export const router = createBrowserRouter([

    {
        path: "/",
        element: <UserLayout />,
        children: [
            // 1. General Public Routes (Accessible to everyone)
            {
                index: true,
                element: <LandingPage />
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
                        path: "home",
                        element: <HomePage />,
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
                                element: <div className="p-4 text-xl">Admin Dashboard Placeholder</div>,
                            },
                        ],
                    },
                ],
            },
        ],
    },

])