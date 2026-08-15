import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/auth.store";

const PublicRoute = () => {
  const user = useAuthStore((state) => state.user);
  const isBootstrapped = useAuthStore((state) => state.isBootstrapped);
  const location = useLocation();

  if (!isBootstrapped) {
    return null;
  }

  if (user) {
    // Redirect to the saved location, or default based on role
    const defaultHome = user.role === "admin" ? "/admin" : "/home";
    const from = (location.state as any)?.from?.pathname || defaultHome;
    return <Navigate to={from} replace />;
  }

  return <Outlet />;
};

export default PublicRoute;
