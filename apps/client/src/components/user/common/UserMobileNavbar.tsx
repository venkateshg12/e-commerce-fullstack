import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import NavSearch from "./NavSearch";
import { useGetCart } from "@/hooks/cart/useGetCart";
import { useGetWishlist } from "@/hooks/wishlist/useGetWishlist";
import { useAuthStore } from "@/store/auth.store";
import type { NavItem } from "@/types";
import { Heart, HeartIcon, LogIn, LogOut, Menu, ShoppingBag, ShoppingCart, User } from "lucide-react";
import { Link } from "react-router-dom";


const collectionsPage: NavItem = {
    label: "Collections",
    href: "/collections",
    icon: ShoppingBag,
};

const DrawSection = ({ title, items }: { title: string, items: NavItem[] }) => {
    return (
        <section className="drawer-section">
            <p className="drawer-title">{title}</p>
            <div className="drawer-items-wrap">
                {
                    items.map(item => {
                        const Icon = item.icon;
                        return <Link key={item.label} to={item.href} className="drawer-item-link">
                            <Icon className="h-4.5 w-.45" />
                            <span>{item.label}</span>
                        </Link>
                    })
                }
            </div>

        </section>
    )
}


const UserMobileNavbar = () => {
    const user = useAuthStore(state => state.user);
    // The hooks gate on `user`, so these stay 0 for a signed-out visitor.
    const { data: wishlist } = useGetWishlist();
    const wishlistCount = wishlist?.data.items.length ?? 0;
    const { data: cart } = useGetCart();
    const cartCount = cart?.data.totalQuantity ?? 0;

    // Cart is auth-only on the backend, so it only appears in the signed-in branch.
    const mobileAccountItems: NavItem[] = user ? [
        { label: "Account", href: "/account", icon: User },
        { label: "Wishlist", href: "/wishlist", icon: Heart },
        { label: "Cart", href: "/cart", icon: ShoppingCart },
        { label: "Sign Out", href: "/logout", icon: LogOut }
    ] :
        [{ label: 'Login', href: "/login", icon: LogIn }];


    return (
        <div className="mobile-wrap">
            {/* On a phone the whole nav used to live behind the hamburger, which put the cart —
                the thing a shopper returns to most — two taps away and hid its count entirely. */}
            <Link to="/wishlist" className="icon-link" aria-label="Wishlist">
                <HeartIcon className="h-4.5 w-4.5" />
                {wishlistCount > 0 ? <span className="cart-badge">{wishlistCount}</span> : null}
            </Link>

            <Link to="/cart" className="icon-link" aria-label="Cart">
                <ShoppingCart className="h-4.5 w-4.5" />
                {cartCount > 0 ? <span className="cart-badge">{cartCount}</span> : null}
            </Link>

            <Sheet>
                <SheetTrigger asChild>
                    <Button variant={"ghost"} size={'icon'} className="menu-button">
                        <Menu className="h-5 w-5" />
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="sheet-content">
                    <SheetHeader className="sr-only">
                        <SheetTitle>
                            Menu
                        </SheetTitle>
                    </SheetHeader>
                    <div className="brand-block">
                        <Link to={"/"} className="brand-wrap">
                            <img src="/logo.png" alt="logo" className="h-8 w-30" />
                        </Link>
                    </div>
                    <Separator />
                    {/* Same box as the desktop header, so searching isn't desktop-only. */}
                    <div className="mobile-search-wrap">
                        <NavSearch />
                    </div>
                    <Separator />
                    <DrawSection title="Collections" items={[collectionsPage]} />
                    <Separator />
                    <DrawSection title="Account" items={mobileAccountItems} />
                </SheetContent>
            </Sheet>
        </div>
    )
}

export default UserMobileNavbar;
