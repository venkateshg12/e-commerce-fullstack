import Razorpay from "razorpay";
import { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } from "../constants/env";
import { BAD_GATEWAY } from "../constants/https";
import { AppError } from "./errors";

export const razorpay = new Razorpay({
    key_id : RAZORPAY_KEY_ID,
    key_secret : RAZORPAY_KEY_SECRET
});

/**
 * Wraps a Razorpay SDK call. The SDK rejects with a plain object ({ statusCode, error }) rather
 * than an Error, so without this every gateway failure reached the client as a bare
 * "Internal Server Error" with nothing in it to act on. The real reason is logged for the
 * operator; the customer gets a clear 502 that says the payment gateway, not the shop, failed.
 */
export const callRazorpay = async <T>(operation: string, call: () => Promise<T>): Promise<T> => {
    try {
        return await call();
    } catch (error) {
        const failure = error as { statusCode?: number; error?: { code?: string; description?: string } };
        console.error(
            `[razorpay] ${operation} failed:`,
            failure?.statusCode,
            failure?.error?.code,
            failure?.error?.description ?? error
        );

        throw new AppError(
            BAD_GATEWAY,
            failure?.statusCode === 401
                // Bad or revoked API keys — a setup problem, not something a retry will fix.
                ? "Online payment is unavailable right now because the payment gateway rejected our credentials. Please try again later or contact support."
                : "Could not reach the payment gateway. Please try again in a moment."
        );
    }
};
