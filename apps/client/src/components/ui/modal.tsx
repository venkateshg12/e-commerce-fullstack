import type { ModalProps } from "@/types";
import React, { useEffect } from "react";
import { createPortal } from "react-dom";


export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
  // Freeze the page behind the modal. This has to be on <html>, not <body>: App.css gives <html>
  // its own `overflow-y: scroll`, so a body overflow never reaches the viewport and the page kept
  // scrolling. The scrollbar disappears, but `scrollbar-gutter: stable` keeps its space reserved,
  // so nothing behind the modal shifts sideways.
  useEffect(() => {
    if (!isOpen) return;
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previousOverflow;
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

  return createPortal(
    <div className="fixed inset-0 z-[9999] pointer-events-auto flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Semi-transparent Backdrop with Premium Blur */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ease-out animate-in fade-in pointer-events-auto"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-hidden="true"
      />

      {/* Modal Wrapper for centering and animation */}
      <div 
        className="relative z-50 pointer-events-auto w-full max-w-md transform overflow-hidden rounded-xl bg-transparent transition-all duration-300 ease-out animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Content */}
        <div className="w-full">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};
