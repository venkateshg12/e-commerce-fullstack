const RAZORPAY_SRC = "https://checkout.razorpay.com/v1/checkout.js";

let razorpayPromise: Promise<void> | null = null;

/**
 * Loads Razorpay's checkout script on demand. Unlike the Google SDK, there is no tag in
 * index.html — nobody who isn't checking out should pay for this script — so this injects it.
 *
 * The promise is cached so concurrent callers share one load, and cleared on failure so a retry
 * (e.g. after the user unblocks an ad blocker) can actually try again.
 */
export function loadRazorpaySdk(): Promise<void> {
    if (razorpayPromise) return razorpayPromise;

    razorpayPromise = new Promise<void>((resolve, reject) => {
        if (window.Razorpay) {
            resolve();
            return;
        }

        const existing = document.querySelector<HTMLScriptElement>(`script[src="${RAZORPAY_SRC}"]`);
        const script = existing ?? document.createElement("script");

        script.addEventListener("load", () => resolve());
        script.addEventListener("error", () =>
            reject(new Error("Failed to load the Razorpay checkout script"))
        );

        if (!existing) {
            script.src = RAZORPAY_SRC;
            script.async = true;
            document.head.appendChild(script);
        }
    });

    razorpayPromise = razorpayPromise.catch((error) => {
        razorpayPromise = null;
        throw error;
    });

    return razorpayPromise;
}
