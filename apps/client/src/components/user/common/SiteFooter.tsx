import { useAuthStore } from "@/store/auth.store";
import { Link } from "react-router-dom";

const shopLinks = [
  { label: "All products", href: "/collections" },
  { label: "Wishlist", href: "/wishlist" },
  { label: "Cart", href: "/cart" },
];

const memberLinks = [
  { label: "My account", href: "/account" },
  { label: "My orders", href: "/orders" },
];

const guestLinks = [
  { label: "Sign in", href: "/login" },
  { label: "Create account", href: "/register" },
];

const SiteFooter = () => {
  const user = useAuthStore((state) => state.user);
  const accountLinks = user ? memberLinks : guestLinks;

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <Link to="/" aria-label="ShopyMart home">
            <img src="/logo.png" alt="ShopyMart" className="site-footer-logo" />
          </Link>
          <p className="site-footer-tagline">Smart Shopping, Better Living</p>
        </div>

        <nav className="site-footer-col" aria-label="Shop">
          <h2 className="site-footer-heading">Shop</h2>
          {shopLinks.map((link) => (
            <Link key={link.href} to={link.href} className="site-footer-link">
              {link.label}
            </Link>
          ))}
        </nav>

        <nav className="site-footer-col" aria-label="Account">
          <h2 className="site-footer-heading">Account</h2>
          {accountLinks.map((link) => (
            <Link key={link.href} to={link.href} className="site-footer-link">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="site-footer-bar">
        <p>© {new Date().getFullYear()} ShopyMart. All rights reserved.</p>
        <p>Payments secured by Razorpay</p>
      </div>
    </footer>
  );
};

export default SiteFooter;
