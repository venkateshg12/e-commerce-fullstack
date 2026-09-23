import { Laptop, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAccountSessions } from "@/hooks/account/useAccountSessions";
import type { SessionSummary } from "@/types";

/*
  A browser's user-agent string is unreadable, so show the part people recognise. Deliberately
  rough: it labels the device, it isn't a security claim.
 */
const describeDevice = (userAgent?: string) => {
  if (!userAgent) return "Unknown device";

  const browser =
    /edg/i.test(userAgent) ? "Edge"
    : /chrome|crios/i.test(userAgent) ? "Chrome"
    : /firefox|fxios/i.test(userAgent) ? "Firefox"
    : /safari/i.test(userAgent) ? "Safari"
    : "Browser";

  const platform =
    /android/i.test(userAgent) ? "Android"
    : /iphone|ipad|ipod/i.test(userAgent) ? "iOS"
    : /windows/i.test(userAgent) ? "Windows"
    : /mac os/i.test(userAgent) ? "macOS"
    : /linux/i.test(userAgent) ? "Linux"
    : "";

  return platform ? `${browser} on ${platform}` : browser;
};

const formatSignedIn = (value: string) => {
  const date = new Date(value);
  return isNaN(date.getTime())
    ? value
    : date.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
};

function SessionRow({
  session,
  onRevoke,
  isRevoking,
}: {
  session: SessionSummary;
  onRevoke: (sessionId: string) => void;
  isRevoking: boolean;
}) {
  return (
    <li className="session-row">
      <div className="session-row-main">
        <Laptop className="session-row-icon" />
        <div>
          <p className="session-row-device">
            {describeDevice(session.userAgent)}
            {session.isCurrent ? <span className="session-row-current">This device</span> : null}
          </p>
          <p className="session-row-meta">Signed in {formatSignedIn(session.createdAt)}</p>
        </div>
      </div>

      {/* The current session is left alone: ending it here is just a confusing logout. */}
      {session.isCurrent ? null : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="cursor-pointer"
          disabled={isRevoking}
          onClick={() => onRevoke(session._id)}
        >
          {isRevoking ? "Signing out..." : "Sign out"}
        </Button>
      )}
    </li>
  );
}

function AccountSessionsTab() {
  const { sessions, loading, isError, revoke, revokingSessionId, revokeError } = useAccountSessions();

  return (
    <div className="account-section">
      <div className="account-addresses-header">
        <div className="account-addresses-title-row">
          <ShieldCheck className="account-card-icon" />
          <h3 className="font-heading text-base font-semibold">Where you're signed in</h3>
        </div>
      </div>

      <p className="session-intro">
        Every device signed in to this account. Sign one out if you don't recognise it — it loses
        access immediately.
      </p>

      {revokeError ? (
        <div className="error-box-class">
          {revokeError.message || "Couldn't sign that device out. Please try again."}
        </div>
      ) : null}

      {isError ? (
        <div className="error-box-class">Couldn't load your devices. Please refresh and try again.</div>
      ) : loading ? (
        <p className="session-intro">Loading...</p>
      ) : (
        <ul className="session-list">
          {sessions.map((session) => (
            <SessionRow
              key={session._id}
              session={session}
              onRevoke={revoke}
              isRevoking={revokingSessionId === session._id}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

export default AccountSessionsTab;
