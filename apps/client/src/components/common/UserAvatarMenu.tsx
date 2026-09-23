import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/store/auth.store";
import { useLogout } from "@/hooks/auth/useLogout";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { LogOut, Package, User as UserIcon } from "lucide-react";

interface UserAvatarMenuProps {
  accountHref?: string;
  accountLabel?: string;
  align?: "start" | "end" | "center";
}

export const UserAvatarMenu = ({
  accountHref,
  accountLabel,
  align = "end",
}: UserAvatarMenuProps) => {
  const user = useAuthStore((state) => state.user);
  const { mutate: handleLogout, isPending: isLoggingOut } = useLogout();
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [user?.avatar]);

  if (!user) return null;

  const targetHref =
    accountHref || (user.role === "admin" ? "/admin/settings" : "/account");
  const label =
    accountLabel || (user.role === "admin" ? "Manage Account" : "My Account");

  const initial = user.name
    ? user.name.charAt(0).toUpperCase()
    : user.email
    ? user.email.charAt(0).toUpperCase()
    : "U";

  const hasValidAvatar = Boolean(user.avatar && user.avatar.trim() !== "" && !imgError);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-10 w-10 mx-4 rounded-full p-0 overflow-hidden  transition-all cursor-pointer shrink-0"
        >
          {hasValidAvatar ? (
            <img
              src={user.avatar}
              alt=""
              onError={() => setImgError(true)}
              className="h-full w-full object-cover rounded-full"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm select-none">
              {initial}
            </div>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-56 p-2 z-50">
        <div className="px-2 py-1.5 text-xs text-muted-foreground border-b mb-1">
          <p className="font-semibold text-foreground truncate">
            {user.name || "User"}
          </p>
          <p className="truncate text-xs">{user.email}</p>
        </div>
        <DropdownMenuItem asChild>
          <Link
            to={targetHref}
            className="flex items-center gap-2 cursor-pointer w-full py-2"
          >
            <UserIcon className="h-4 w-4" />
            <span>{label}</span>
          </Link>
        </DropdownMenuItem>
        {/* Customers only — an admin manages everyone's orders from the admin panel instead. */}
        {user.role !== "admin" ? (
          <DropdownMenuItem asChild>
            <Link
              to="/orders"
              className="flex items-center gap-2 cursor-pointer w-full py-2"
            >
              <Package className="h-4 w-4" />
              <span>My Orders</span>
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          onClick={() => handleLogout()}
          disabled={isLoggingOut}
          className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600 w-full py-2"
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserAvatarMenu;
