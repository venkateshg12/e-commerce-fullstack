import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/auth.store";

const ProtectedRoute: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const isBootstrapped = useAuthStore((state) => state.isBootstrapped);
  const location = useLocation();

  if (!isBootstrapped) {
    return null;
  }

  if (!user) {
    // Save the location the user was trying to access so we can redirect them back after logging in
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
