import { cn } from "@/core/lib/cn";
import type { ReactNode } from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "purple" | "outline";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-gray-800 text-gray-300 border-gray-700",
  success: "bg-green-900/40 text-green-400 border-green-700/50",
  warning: "bg-yellow-900/40 text-yellow-400 border-yellow-700/50",
  danger: "bg-red-900/40 text-red-400 border-red-700/50",
  purple: "bg-purple-900/40 text-purple-400 border-purple-700/50",
  outline: "bg-transparent text-gray-400 border-gray-700",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
