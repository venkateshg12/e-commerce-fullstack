let gsiPromise: Promise<void> | null = null;

export function loadGoogleSdk(): Promise<void> {
    if (gsiPromise) return gsiPromise;

    gsiPromise = new Promise((resolve, reject) => {
        // Already loaded (e.g. hot reload, multiple mounts)
        if (window.google?.accounts?.id) {
            resolve();
            return;
        }

        const script = document.querySelector<HTMLScriptElement>(
            'script[src="https://accounts.google.com/gsi/client"]'
        );

        if (!script) {
            reject(new Error("Google script tag not found in index.html"));
            return;
        }

        script.addEventListener("load", () => resolve());
        script.addEventListener("error", () =>
            reject(new Error("Failed to load Google Identity Services script"))
        );

        setTimeout(() => {
            if (window.google?.accounts?.id) resolve();
        }, 100);

    });

    return gsiPromise;
}