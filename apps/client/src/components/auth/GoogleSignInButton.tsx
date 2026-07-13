import { useEffect, useRef } from "react";
import { useGoogleLogin } from "@/hooks/auth/useGoogleLogin";
import { GOOGLE_CLIENT_ID } from "@/constants/env";
import type { GoogleCredentialResponse } from "@/lib/google";

const GOOGLE_SDK_POLL_INTERVAL_MS = 100;

function isGoogleSdkReady(): boolean {
  return Boolean(window.google?.accounts?.id);
}

function initializeGoogleSignIn(
  buttonContainer: HTMLDivElement,
  onCredential: (response: GoogleCredentialResponse) => void
): void {
  if (!isGoogleSdkReady()) {
    return;
  }

  window.google!.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: onCredential,
    auto_select: false,
  });

  window.google!.accounts.id.renderButton(buttonContainer, {
    theme : "outline",
    size: "large",
    text: "continue_with",
    shape: "rectangular",
    width: buttonContainer.clientWidth || 300,
  });
}

export const GoogleSignInButton = () => {
  const buttonRef = useRef<HTMLDivElement>(null);
  const { mutate: loginWithGoogle } = useGoogleLogin();

  useEffect(() => {
    const handleCredentialResponse = (response: GoogleCredentialResponse) => {
      if (response.credential) {
        loginWithGoogle(response.credential);
      }
    };

    const tryInitialize = () => {
      if (buttonRef.current) {
        initializeGoogleSignIn(buttonRef.current, handleCredentialResponse);
      }
    };

    if (isGoogleSdkReady()) {
      tryInitialize();
      return;
    }

    // Retry periodically until the SDK script has finished loading
    const timer = setInterval(() => {
      if (isGoogleSdkReady()) {
        tryInitialize();
        clearInterval(timer);
      }
    }, GOOGLE_SDK_POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [loginWithGoogle]);

  return (
    <div className="w-full flex  rounded-lg">
      <div
        ref={buttonRef}
        className="w-full flex "
        style={{ minHeight: "36px" }}
      />
    </div>
  );
};

export default GoogleSignInButton;