import type { ModalProps } from "@/lib/types";
import React, { useEffect } from "react";


export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
  // Prevent scrolling on mount
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Semi-transparent Backdrop with Premium Blur */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ease-out animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Wrapper for centering and animation */}
      <div className="relative z-10 w-full max-w-md transform overflow-hidden rounded-xl bg-transparent shadow-2xl transition-all duration-300 ease-out animate-in fade-in zoom-in-95">
        {/* Modal Content */}
        <div className="w-full">
          {children}
        </div>
      </div>
    </div>
  );
};
