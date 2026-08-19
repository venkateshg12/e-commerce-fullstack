import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/store/auth.store";

interface RoleGuardLayoutProps {
  allow: string[];
}

export const RoleGuardLayout = ({ allow }: RoleGuardLayoutProps) => {
  const user = useAuthStore((state) => state.user);

  if (!user || !allow.includes(user.role)) {
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
};

export default RoleGuardLayout;
