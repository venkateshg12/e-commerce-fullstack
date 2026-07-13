import React from "react";
import { Modal } from "./modal";
import { Button } from "./button";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AlertPopupProps } from "@/lib/types";



export const AlertPopup: React.FC<AlertPopupProps> = ({
  isOpen,
  type,
  title,
  description,
  onClose,
  actionLabel = "Close",
  onAction,
  autoCloseDuration,
}) => {

   // Add auto-close timer hook:
  React.useEffect(() => {
    if (isOpen && autoCloseDuration) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDuration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoCloseDuration, onClose]);

  const config = {
    success: {
      icon: <CheckCircle2 className="h-12 w-12 text-emerald-500 animate-pulse" />,
      bg: "bg-emerald-500/10 border-emerald-500/25",
      buttonClass: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20",
    },
    error: {
      icon: <AlertCircle className="h-12 w-12 text-rose-500 animate-pulse" />,
      bg: "bg-rose-500/10 border-gray-700/25",
      buttonClass: "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20",
    },
    info: {
      icon: <Info className="h-12 w-12 text-blue-500 animate-pulse" />,
      bg: "bg-blue-500/10 border-blue-500/25",
      buttonClass: "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20",
    },
    warning: {
      icon: <AlertTriangle className="h-12 w-12 text-amber-500 animate-pulse" />,
      bg: "bg-amber-500/25 border-amber-700/25",
      buttonClass: "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20",
    },
  };

  const current = config[type];

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="relative overflow-hidden rounded-xl border border-gray-500 bg-white text-black p-6 shadow-2xl backdrop-blur-xl">
        <div className="absolute -top-12 -left-12 h-32 w-32 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-gray-900 hover:scale-[1.1]  transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center text-center mt-2">
          <div className={cn("p-4 rounded-full mb-4 border", current.bg)}>
            {current.icon}
          </div>

          <h3 className="font-lato font-bold text-xl tracking-wide mb-2 text-black">
            {title}
          </h3>

          <p className="font-ubuntuMono text-sm  max-w-sm mb-6 leading-relaxed">
            {description}
          </p>

          <Button
            onClick={onAction || onClose}
            className={cn(
              "w-full py-2.5 font-lato font-bold tracking-widest text-xs md:text-sm border border-black/35 rounded-lg cursor-pointer active:scale-95 transition-all shadow-lg",
              current.buttonClass
            )}
          >
            {actionLabel.toUpperCase()}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
