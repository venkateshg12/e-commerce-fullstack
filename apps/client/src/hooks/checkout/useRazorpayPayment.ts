import { useConfirmCheckout } from "@/hooks/checkout/useConfirmCheckout";
import { loadRazorpaySdk } from "@/lib/razorpay/loadRazorpay";
import type { RazorpaySuccessResponse } from "@/lib/razorpay/razorpay";
import { useAuthStore } from "@/store/auth.store";
import type { AlertType, CheckoutSessionResponse, SuccessResponse } from "@/types";
import type { ConfirmCheckoutSessionSchema } from "@repo/types";
import { useState } from "react";

export type PaymentFeedback = {
    type: AlertType;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
};

type UseRazorpayPaymentOptions = {
    // The page owns the AlertPopup; this hook just says what to show.
    onFeedback: (feedback: PaymentFeedback) => void;
    // Fired once the server has confirmed the order as paid.
    onPaid: (result: { orderId: string; totalAmount: number }) => void;
    // Shown when the user closes the modal without paying.
    cancelledDescription?: string;
};

const getErrorMessage = (error: unknown, fallback: string) =>
    (error as { message?: string } | null)?.message || fallback;

/**
 * The Razorpay half of paying for an order, shared by /checkout (a fresh session built from the
 * cart) and /orders (a session resumed for an order abandoned earlier). Both hand it a function
 * that yields a session; everything from there — loading the SDK, the modal, confirming with the
 * server, and the retry-on-network-failure rule — lives here once, because it is payment code and
 * two diverging copies would be the worst kind of duplication.
 */
export const useRazorpayPayment = ({
    onFeedback,
    onPaid,
    cancelledDescription = "Nothing was charged and your cart is untouched.",
}: UseRazorpayPaymentOptions) => {
    const user = useAuthStore((state) => state.user);
    const confirmMutation = useConfirmCheckout();
    const [isPaying, setIsPaying] = useState(false);

    const confirm = (payload: ConfirmCheckoutSessionSchema, totalAmount: number) => {
        confirmMutation.mutate(payload, {
            onSuccess: (response) => {
                setIsPaying(false);
                onPaid({ orderId: response.data._id, totalAmount });
            },
            onError: (error) => {
                setIsPaying(false);
                // The interceptor overwrites `status` with the numeric HTTP status, which the
                // declared error type still calls a string literal — hence the double cast.
                const status = (error as unknown as { status?: number } | null)?.status ?? 0;

                // The money is already captured and confirm is idempotent, so a transport failure
                // is a retry, not a loss.
                if (status === 0 || status >= 500) {
                    onFeedback({
                        type: "warning",
                        title: "Payment received — confirming",
                        description:
                            "We're still confirming your payment. Please don't close this window, and try again.",
                        actionLabel: "Retry",
                        onAction: () => confirm(payload, totalAmount),
                    });
                    return;
                }

                // A signature/amount failure must never be treated as success, and the customer
                // needs the payment id to be able to chase it.
                onFeedback({
                    type: "error",
                    title: "Could not verify payment",
                    description: `${getErrorMessage(
                        error,
                        "Your payment could not be verified."
                    )} Payment ID: ${payload.razorpay_payment_id}. Please contact support with this ID.`,
                });
            },
        });
    };

    /**
     * @param getSession Yields the Razorpay session — a new one for checkout, a resumed one for an
     *   existing order.
     * @param onSessionError Lets the page map its own server errors (cart moved, address gone…)
     *   to something more useful than a generic popup.
     */
    const pay = async (
        getSession: () => Promise<SuccessResponse<CheckoutSessionResponse>>,
        onSessionError?: (error: unknown) => void
    ) => {
        setIsPaying(true);

        try {
            await loadRazorpaySdk();
        } catch (error) {
            setIsPaying(false);
            onFeedback({
                type: "error",
                title: "Payment unavailable",
                description: getErrorMessage(
                    error,
                    "Could not load the payment gateway. Check your connection or disable any ad blocker, then try again."
                ),
            });
            return;
        }

        let session: SuccessResponse<CheckoutSessionResponse>;
        try {
            session = await getSession();
        } catch (error) {
            setIsPaying(false);
            if (onSessionError) {
                onSessionError(error);
            } else {
                onFeedback({
                    type: "error",
                    title: "Could not start payment",
                    description: getErrorMessage(error, "Could not start payment."),
                });
            }
            return;
        }

        const { razorpay, order } = session.data;

        try {
            if (!window.Razorpay) {
                throw new Error("Razorpay is unavailable");
            }

            const instance = new window.Razorpay({
                key: razorpay.keyId,
                // Already in paise — passing it straight through is the whole point.
                amount: razorpay.amount,
                currency: razorpay.currency,
                order_id: razorpay.orderId,
                name: "Monster E-commerce",
                description: `Order ${order._id}`,
                prefill: { name: user?.name, email: user?.email },
                handler: (response: RazorpaySuccessResponse) => {
                    confirm(
                        {
                            orderId: order._id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_signature: response.razorpay_signature,
                        },
                        order.totalAmount
                    );
                },
                modal: {
                    ondismiss: () => {
                        setIsPaying(false);
                        onFeedback({
                            type: "info",
                            title: "Payment cancelled",
                            description: cancelledDescription,
                        });
                    },
                },
            });

            instance.on("payment.failed", (response) => {
                setIsPaying(false);
                onFeedback({
                    type: "error",
                    title: "Payment failed",
                    description:
                        response.error?.description ||
                        "The payment could not be completed. Please try again.",
                });
            });

            instance.open();
        } catch (error) {
            setIsPaying(false);
            onFeedback({
                type: "error",
                title: "Could not open checkout",
                description: getErrorMessage(error, "The payment window could not be opened."),
            });
        }
    };

    return { isPaying, isConfirming: confirmMutation.isPending, pay };
};
