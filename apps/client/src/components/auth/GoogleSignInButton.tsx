import { useEffect, useRef } from "react";
import { useGoogleLogin } from "@/hooks/auth/useGoogleLogin";
import { GOOGLE_CLIENT_ID } from "@/constants/env";
import type { GoogleCredentialResponse } from "@/lib/google/google";
import { loadGoogleSdk } from "@/lib/google/loadGsi";



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
    theme : "filled_blue",
    size: "medium",
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

  let cancelled = false;

  loadGoogleSdk()
    .then(() => {
      if (!cancelled && buttonRef.current) {
        initializeGoogleSignIn(buttonRef.current, handleCredentialResponse);
      }
    })
    .catch((err) => {
      console.error(err);
      // optionally surface a fallback "Sign in" button / error state
    });

  return () => {
    cancelled = true;
  };
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

/*

┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Browser   │◄───────►│    Google    │         │  Your API   │
│  (React)    │         │   Servers    │         │  (Express)  │
└──────┬──────┘         └──────────────┘         └──────┬──────┘
       │                                                  │
       │  1. User clicks "Sign in with Google"            │
       │  2. Google shows account picker, user confirms   │
       │  3. Google hands browser a signed "ID token"     │
       │     (a piece of proof, like a sealed envelope)   │
       │                                                  │
       │  4. Browser forwards that sealed envelope ───────►
       │                                                  │
       │                          5. Your server asks Google:
       │                             "is this envelope real?"
       │                                                  │
       │                          6. Google confirms it's real
       │                             and hands back what's inside
       │                                                  │
       │  7. Server creates a session + login cookies      │
       │  8. Browser is now logged in ◄────────────────────

       */