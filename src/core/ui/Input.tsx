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
            className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            "w-full rounded-xl border border-gray-800 bg-[#0b0e14] px-4 py-3 text-sm text-gray-200 placeholder:text-gray-600",
            "outline-hidden transition-colors duration-200",
            "focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30",
            error && "border-red-500 focus:border-red-500 focus:ring-red-500/30",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-[10px] font-medium text-red-400">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
