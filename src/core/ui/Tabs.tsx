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
    <div className={cn("flex gap-1 rounded-xl bg-[#0b0e14] p-1", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all duration-200",
            activeTab === tab.id
              ? "bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]"
              : "text-gray-500 hover:text-gray-300"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
