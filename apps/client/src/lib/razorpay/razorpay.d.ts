// The three fields Razorpay hands back on a successful payment, forwarded verbatim (snake_case) to
// POST /checkout/confirm.
export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayFailedResponse {
  error: {
    code?: string;
    description?: string;
    reason?: string;
    step?: string;
    source?: string;
  };
}

interface RazorpayOptions {
  key: string;
  // Already in paise, straight from the create-session response — never multiply it again.
  amount: number;
  currency: string;
  order_id: string;
  name?: string;
  description?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  handler?: (response: RazorpaySuccessResponse) => void;
  modal?: {
    ondismiss?: () => void;
  };
}

interface RazorpayInstance {
  open: () => void;
  on: (event: "payment.failed", handler: (response: RazorpayFailedResponse) => void) => void;
}

type RazorpayConstructor = new (options: RazorpayOptions) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

export type { RazorpayOptions, RazorpayInstance };
