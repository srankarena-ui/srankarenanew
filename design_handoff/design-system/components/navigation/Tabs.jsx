import React from "react";

if (typeof document !== "undefined" && !document.getElementById("sra-tabs-css")) {
  const s = document.createElement("style");
  s.id = "sra-tabs-css";
  s.textContent = `
.sra-tabs{display:inline-flex;gap:4px;padding:4px;background:var(--surface-inset);
  border:1px solid var(--border);border-radius:var(--radius-pill);}
.sra-tabs--block{display:flex;width:100%;}
.sra-tab{flex:1;display:inline-flex;align-items:center;justify-content:center;gap:7px;
  font-family:var(--font-sans);font-size:13px;font-weight:var(--fw-semibold);letter-spacing:-0.01em;
  color:var(--text-secondary);background:transparent;border:none;cursor:pointer;white-space:nowrap;
  padding:8px 16px;border-radius:var(--radius-pill);
  transition:color var(--dur) var(--ease-out),background var(--dur) var(--ease-out),box-shadow var(--dur) var(--ease-out);}
.sra-tab:hover{color:var(--text);}
.sra-tab--active{color:var(--text-onaccent);background:var(--accent);box-shadow:var(--shadow-glow);}
.sra-tab--active:hover{color:var(--text-onaccent);}
.sra-tab__icon{display:inline-flex;width:15px;height:15px;}
.sra-tab__icon svg{width:100%;height:100%;}
.sra-tab__count{font-family:var(--font-mono);font-size:11px;opacity:.7;}
`;
  document.head.appendChild(s);
}

/** Segmented tab control. `tabs` = [{ id, label, icon?, count? }]. */
export function Tabs({ tabs = [], value, onChange, block = false, className = "", ...props }) {
  return (
    <div className={["sra-tabs", block ? "sra-tabs--block" : "", className].filter(Boolean).join(" ")} role="tablist" {...props}>
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active}
            className={["sra-tab", active ? "sra-tab--active" : ""].filter(Boolean).join(" ")}
            onClick={() => onChange && onChange(tab.id)}
          >
            {tab.icon && <span className="sra-tab__icon">{tab.icon}</span>}
            {tab.label}
            {tab.count != null && <span className="sra-tab__count">{tab.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
