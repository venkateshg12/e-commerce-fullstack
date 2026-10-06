import { useServerStore } from "@/store/server.store";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useEffect } from "react";

// How long "Server is ready" stays up before the notice leaves.
const READY_VISIBLE_MS = 2000;

/**
 * Tells a visitor why the site is slow when the free-tier backend is waking from sleep, so a long
 * first load reads as "starting up" rather than "broken". It never blocks the page: the skeletons
 * stay visible behind it, and it leaves by itself once the server answers.
 */
const ServerWakeNotice = () => {
  const status = useServerStore((state) => state.status);
  const reset = useServerStore((state) => state.reset);

  useEffect(() => {
    if (status !== "ready") return;
    const timer = setTimeout(reset, READY_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [status, reset]);

  if (status === "idle") return null;

  return (
    <div className="server-notice" role="status" aria-live="polite">
      {status === "waking" ? (
        <Loader2 className="server-notice-icon server-notice-icon-spin" aria-hidden="true" />
      ) : (
        <CheckCircle2 className="server-notice-icon server-notice-icon-ready" aria-hidden="true" />
      )}

      <div className="min-w-0 flex-1">
        {status === "waking" ? (
          <>
            <p className="server-notice-title">Waking up our server</p>
            <p className="server-notice-text">
              The store runs on a free tier that sleeps when idle, so the first load can take up to a
              minute. Your products will appear automatically.
            </p>
            <div className="server-notice-track" aria-hidden="true">
              <div className="server-notice-bar" />
            </div>
          </>
        ) : (
          <>
            <p className="server-notice-title">Server is ready</p>
            <p className="server-notice-text">Thanks for waiting — loading your store now.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default ServerWakeNotice;
