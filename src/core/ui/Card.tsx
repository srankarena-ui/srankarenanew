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
        "rounded-2xl border border-gray-800 bg-[#121620] p-5",
        hover && "transition-all duration-300 hover:-translate-y-1 hover:border-gray-700 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)]",
        className
      )}
    >
      {children}
    </div>
  );
}
