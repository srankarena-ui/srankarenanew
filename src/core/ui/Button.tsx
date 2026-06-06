"use client";

import { cn } from "@/core/lib/cn";
import { type ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-accent)] text-[var(--color-text-onaccent)] border-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] hover:border-[var(--color-accent-hover)] hover:shadow-[var(--color-accent-glow)] active:bg-[var(--color-accent-press)] active:scale-[0.97]",
  secondary:
    "bg-transparent text-[var(--color-text-primary)] border-[var(--color-border)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] active:scale-[0.97]",
  danger:
    "bg-[var(--color-danger-soft)] text-[var(--color-danger)] border-[var(--color-danger)] hover:bg-[var(--color-danger)]/25 hover:border-[var(--color-danger)] active:scale-[0.97]",
  ghost:
    "bg-transparent text-[var(--color-text-primary)] border-transparent hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] active:scale-[0.97]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-7 py-3.5 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-2xl border font-bold transition-all duration-200",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
