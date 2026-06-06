"use client";

import { cn } from "@/core/lib/cn";
import { useEffect, type ReactNode } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  className?: string;
}

export function Modal({ isOpen, onClose, children, title, className }: ModalProps) {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-md"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        role="button"
        tabIndex={0}
        aria-label="Close modal"
      />
      {/* Panel */}
      <div
        className={cn(
          "relative z-10 w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6",
          "shadow-[var(--shadow-lg)]",
          "animate-in fade-in zoom-in-95 duration-200",
          className
        )}
      >
        {title && (
          <h2 className="mb-4 text-lg font-bold text-[var(--color-text-primary)]">
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
}
