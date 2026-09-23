import { cn } from "@/lib/utils";

const STEPS = ["Bag", "Address", "Payment"] as const;

type CartStepsProps = {
  // Address and payment both live on /checkout, so that page lights up "Address".
  current: (typeof STEPS)[number];
};

const CartSteps = ({ current }: CartStepsProps) => {
  return (
    <div className="cart-steps">
      {STEPS.map((step, index) => (
        <div key={step} className="contents">
          {index > 0 ? <span className="cart-step-divider" /> : null}
          <span className={cn("cart-step", step === current && "cart-step-active")}>{step}</span>
        </div>
      ))}
    </div>
  );
};

export default CartSteps;
