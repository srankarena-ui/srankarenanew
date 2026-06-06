import { cn } from "@/core/lib/cn";
import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className, hover = false }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5",
        "shadow-[var(--shadow-sm)]",
        hover && "transition-all duration-300 hover:-translate-y-1 hover:border-[var(--color-accent)] hover:shadow-[var(--color-accent-glow)]",
        className
      )}
    >
      {children}
    </div>
  );
}
