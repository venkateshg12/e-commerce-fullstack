import type { NavItem } from "@/types";
import { HeartIcon, LogIn, ShoppingBag, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import NavTextLink from "../NavTextLink";
import { useAuthStore } from "@/store/auth.store";
import { useGetWishlist } from "@/hooks/wishlist/useGetWishlist";
import { useGetCart } from "@/hooks/cart/useGetCart";
import UserMobileNavbar from "./UserMobileNavbar";
import UserAvatarMenu from "../../common/UserAvatarMenu";
import NavSearch from "./NavSearch";

const collectionsPage: NavItem = {
    label: "Collections",
    href: "/collections",
    icon: ShoppingBag,
};

const UserDesktopNavbar = () => {
    const user = useAuthStore((state) => state.user);
    // The hooks themselves gate on `user`, so these stay 0/empty for a logged-out visitor.
    const { data: wishlist } = useGetWishlist();
    const wishlistCount = wishlist?.data.items.length ?? 0;
    const { data: cart } = useGetCart();
    const cartCount = cart?.data.totalQuantity ?? 0;

    return (
        <header className="header-class">
            <div className="shell">
                <Link to="/" className="brand-wrap">
                    <img src="/logo.png" alt="logo" className="h-10 w-34" />
                </Link>
                <div className="desktop-collections-wrap">
                    <NavTextLink
                        href={collectionsPage.href}
                        label={collectionsPage.label}
                        icon={collectionsPage.icon}
                    />
                </div>

                <div className="desktop-search-wrap">
                    <NavSearch />
                </div>

                <nav className="desktop-nav">
                    {/* Count is pinned to the heart icon, not the end of the label, so it never
                        covers the text. */}
                    <Link to="/wishlist" className="wishlist-link">
                        <span className="wishlist-icon-wrap">
                            <HeartIcon className="h-4.5 w-4.5" />
                            {wishlistCount > 0 ? (
                                <span className="wishlist-badge">{wishlistCount}</span>
                            ) : null}
                        </span>
                    </Link>
                    {
                        user ? (
                            <UserAvatarMenu accountHref="/account" accountLabel="My Account" align="end" />
                        ) : (
                            <span className="ml-2">
                                <NavTextLink
                                    href="/login"
                                    label="Sign In"
                                    icon={LogIn}
                                />
                            </span>
                        )
                    }
                    {/* The badge anchors to the 40x40 link box, not to the icon — `.cart-badge` is
                        sized for that corner. (`.wishlist-badge` is the smaller pill that hugs an
                        icon directly, because its label sits right beside it.) */}
                    <Link to={"/cart"} className="icon-link">
                        <ShoppingCart className="h-4.5 w-4.5" />
                        {cartCount > 0 ? (
                            <span className="cart-badge">{cartCount}</span>
                        ) : null}
                    </Link>
                </nav>
                <UserMobileNavbar />
            </div>

        </header >
    )
}

export default UserDesktopNavbar;