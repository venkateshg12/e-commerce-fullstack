import React, { useEffect, useState } from "react";
import { useGetProfile } from "@/hooks/auth/useGetProfile";
import { clearUserQueries } from "@/lib/queryClient";
import { useAuthStore } from "@/store/auth.store";
import { useServerStore } from "@/store/server.store";

interface AuthLoaderProps {
  children: React.ReactNode;
}


const AuthLoader: React.FC<AuthLoaderProps> = ({ children }) => {
  const { data, isSuccess, isError, isLoading } = useGetProfile();
  const setUser = useAuthStore((state) => state.setUser);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const isBootstrapped = useAuthStore((state) => state.isBootstrapped);
  const isServerWaking = useServerStore((state) => state.status === "waking");

  // The splash covers the whole page, which is right for a second or two but not for the minute a
  // sleeping server can take: the storefront's skeletons and the wake-up notice should be visible
  // instead. Once revealed it stays revealed, so the page never unmounts back to the splash.
  const [isRevealed, setIsRevealed] = useState(false);
  if (isServerWaking && !isRevealed) setIsRevealed(true);


  useEffect(() => {
    if (isSuccess && data?.data) {
      setUser({
        id: data?.data?.user?._id,
        name: data?.data?.user?.name,
        email: data?.data?.user?.email,
        avatar: data?.data?.user?.avatar,
        role: data?.data?.user?.role,
      });
    } else if (isError) {
      clearAuth();
      // No session resolved on this load — anything cached for a previous one goes with it.
      clearUserQueries();
    }
  }, [isSuccess, isError, data, setUser, clearAuth]);

  if (!isBootstrapped && isLoading && !isRevealed) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white text-zinc-900 z-9999 p-6 text-center select-none overflow-hidden transition-opacity duration-1000">
        <div className="relative mb-10 h-32 w-32 flex items-center justify-center scale-90 md:scale-100">
          <div className="absolute inset-0 rounded-full border border-zinc-100 animate-[pulse_4s_cubic-bezier(0.4,0,0.6,1)_infinite]" />

          <div className="absolute inset-0 rounded-full border-t border-primary border-l-transparent border-r-transparent border-b-transparent animate-[spin_1.6s_cubic-bezier(0.5,0.1,0.4,0.9)_infinite]" />

          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
        </div>

        <div className="max-w-80 md:max-w-md space-y-6">
          <div className="space-y-2">
            <p className="text-[11px] font-bold tracking-[0.4em] uppercase text-zinc-400 font-lato">
              Welcome to
            </p>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-zinc-900 leading-tight">
              Shopy<span className="text-primary">Mart</span>
            </h1>
            <p className="text-sm tracking-wide text-zinc-500 font-sans">
              Smart Shopping, Better Living
            </p>
          </div>

          <div className="h-px w-8 bg-primary/30 mx-auto" />

          <div className="space-y-2">
            <p className="text-lg font-light tracking-tight text-zinc-800">Please wait…</p>
            <p className="text-[13px] text-zinc-400 font-sans leading-relaxed px-2 md:px-8">
              Setting up your store and getting everything ready for a smooth shopping experience.
            </p>
          </div>
        </div>

        <div className="absolute bottom-16 w-32 md:w-48">
          <div className="h-px w-full bg-zinc-100 overflow-hidden rounded-full">
            <div className="h-full bg-primary/50 animate-[loader_1.6s_ease-in-out_infinite]" />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthLoader;
