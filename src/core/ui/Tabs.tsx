"use client";

import { cn } from "@/core/lib/cn";

interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  return (
    <div className={cn("flex gap-1 rounded-2xl bg-[var(--color-bg-card)] p-1", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "rounded-2xl px-4 py-2 text-[12px] font-bold transition-all duration-200",
            activeTab === tab.id
              ? "bg-[var(--color-accent)] text-[var(--color-text-onaccent)] shadow-[var(--color-accent-glow)]"
              : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
