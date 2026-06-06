"use client";

import { cn } from "@/core/lib/cn";
import { type InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={id}
            className="text-[11px] font-mono uppercase tracking-[0.05em] text-[var(--color-text-muted)]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            "w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]",
            "outline-hidden transition-all duration-200",
            "focus:border-[var(--color-accent)] focus:ring-3 focus:ring-[var(--color-accent-ring)]",
            error && "border-[var(--color-danger)] focus:border-[var(--color-danger)] focus:ring-[var(--color-danger-soft)]",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-[11px] font-medium text-[var(--color-danger)]">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
