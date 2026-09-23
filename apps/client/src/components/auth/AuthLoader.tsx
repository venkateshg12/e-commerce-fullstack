import React, { useEffect } from "react";
import { useGetProfile } from "@/hooks/auth/useGetProfile";
import { clearUserQueries } from "@/lib/queryClient";
import { useAuthStore } from "@/store/auth.store";

interface AuthLoaderProps {
  children: React.ReactNode;
}


const AuthLoader: React.FC<AuthLoaderProps> = ({ children }) => {
  const { data, isSuccess, isError, isLoading } = useGetProfile();
  const setUser = useAuthStore((state) => state.setUser);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const isBootstrapped = useAuthStore((state) => state.isBootstrapped);


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

  if (!isBootstrapped && isLoading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white text-zinc-900 z-9999 p-6 text-center select-none overflow-hidden transition-opacity duration-1000">
        <div className="relative mb-12 h-32 w-32 flex items-center justify-center scale-90 md:scale-100">
          <div className="absolute inset-0 rounded-full border border-zinc-100 animate-[pulse_4s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
          
          <div className="absolute inset-4 rounded-full border-y border-zinc-200/60 animate-[spin_6s_linear_infinite_reverse]" />
          
          <div className="absolute inset-8 rounded-full border-t border-primary border-l-transparent border-r-transparent border-b-transparent animate-[spin_1.2s_cubic-bezier(0.5,0.1,0.4,0.9)_infinite]" />
          
          <div className="h-1 w-1 rounded-full bg-primary" />
        </div>

        <div className="max-w-70 md:max-w-sm space-y-8">
          <div className="space-y-3">
            <h1 className="text-[11px] font-bold tracking-[0.4em] uppercase text-zinc-400 font-lato">
              Security Handshake
            </h1>
            <div className="h-px w-6 bg-primary/30 mx-auto" />
          </div>
          
          <div className="space-y-4">
            <p className="text-2xl font-light tracking-tight text-zinc-800 leading-tight">
              Preparing your <br className="hidden md:block" /> digital experience.
            </p>
            <p className="text-[13px] text-zinc-400 font-sans leading-relaxed px-2 md:px-8">
              Verifying credentials and synchronizing your preferences for a seamless return.
            </p>
          </div>
        </div>

        <div className="absolute bottom-20 w-32 md:w-48">
          <div className="h-px w-full bg-zinc-100 overflow-hidden rounded-full">
            <div className="h-full bg-primary/40 loader-animation" />
          </div>
        </div>

        <div className="absolute bottom-10">
          <span className="text-[9px] font-medium tracking-widest uppercase text-zinc-300">
            Authenticated Workspace
          </span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthLoader;
