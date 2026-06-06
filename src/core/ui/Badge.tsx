import { cn } from "@/core/lib/cn";
import type { ReactNode } from "react";

type BadgeVariant = "default" | "accent" | "success" | "warning" | "danger" | "info" | "outline";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  pulse?: boolean;
  dot?: boolean;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-[var(--color-border)] text-[var(--color-text-secondary)] border-[var(--color-border)]",
  accent: "bg-[var(--color-accent-soft)] text-[var(--color-accent)] border-[var(--color-accent)]/30",
  success: "bg-[var(--color-success-soft)] text-[var(--color-success)] border-[var(--color-success)]/30",
  warning: "bg-[var(--color-warning-soft)] text-[var(--color-warning)] border-[var(--color-warning)]/30",
  danger: "bg-[var(--color-danger-soft)] text-[var(--color-danger)] border-[var(--color-danger)]/30",
  info: "bg-[var(--color-info-soft)] text-[var(--color-info)] border-[var(--color-info)]/30",
  outline: "bg-transparent text-[var(--color-text-secondary)] border-[var(--color-border)]",
};

export function Badge({ children, variant = "default", pulse = false, dot = false, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-mono uppercase tracking-[0.05em]",
        variantClasses[variant],
        pulse && "animate-pulse",
        className
      )}
    >
      {dot && (
        <span className={cn(
          "inline-block h-1.5 w-1.5 rounded-full",
          variant === "danger" ? "bg-[var(--color-danger)]" : "bg-[var(--color-accent)]"
        )} />
      )}
      {children}
    </span>
  );
}
