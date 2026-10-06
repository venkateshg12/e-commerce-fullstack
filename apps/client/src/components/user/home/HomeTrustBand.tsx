import { BadgePercent, RotateCcw, ShieldCheck } from "lucide-react";

// What the store actually offers: Razorpay checkout, returns on delivered orders, coupon codes.
const points = [
  {
    icon: ShieldCheck,
    title: "Secure payments",
    text: "Payments are processed securely by Razorpay.",
  },
  {
    icon: RotateCcw,
    title: "Easy returns",
    text: "Not right? Start a return from any delivered order.",
  },
  {
    icon: BadgePercent,
    title: "Coupons at checkout",
    text: "Have a code? Apply it when you check out.",
  },
];

const HomeTrustBand = () => {
  return (
    <section className="home-trust" aria-label="Why shop with us">
      {points.map(({ icon: Icon, title, text }) => (
        <div key={title} className="home-trust-item">
          <span className="home-trust-icon">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <h3 className="home-trust-title">{title}</h3>
            <p className="home-trust-text">{text}</p>
          </div>
        </div>
      ))}
    </section>
  );
};

export default HomeTrustBand;
