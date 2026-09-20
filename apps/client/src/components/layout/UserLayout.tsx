import { Outlet } from "react-router-dom";
import UserDesktopNavbar from "../user/common/UserDesktopNavbar";

const UserLayout = () => {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <UserDesktopNavbar />
      <main className="flex-1 w-full">
        <Outlet />
      </main>
    </div>
  );
};

export default UserLayout;
