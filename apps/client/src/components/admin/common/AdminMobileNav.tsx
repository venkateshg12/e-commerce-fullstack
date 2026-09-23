import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { useState } from "react";
import { SidebarNav } from "./AdminSidebar";

/**
 * The admin rail is desktop-only, which left every admin page unnavigable on a phone — no way to
 * reach Products, Orders or Settings once you were on one of them. This is the same nav in a
 * drawer, shown only where the rail is hidden.
 */
const AdminMobileNav = () => {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="cursor-pointer lg:hidden"
          aria-label="Open admin menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="admin-mobile-sheet">
        <SheetHeader className="brand-row">
          <SheetTitle className="sr-only">Admin menu</SheetTitle>
          <img src="/logo.png" alt="logo" className="h-9 w-30" />
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {/* Picking a destination closes the drawer — otherwise it covers the page just opened. */}
          <SidebarNav onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AdminMobileNav;
