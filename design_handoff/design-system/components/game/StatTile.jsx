import React from "react";

if (typeof document !== "undefined" && !document.getElementById("sra-stattile-css")) {
  const s = document.createElement("style");
  s.id = "sra-stattile-css";
  s.textContent = `
.sra-stat{display:flex;flex-direction:column;gap:6px;padding:var(--space-4);
  background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius-lg);}
.sra-stat__top{display:flex;align-items:center;gap:8px;}
.sra-stat__icon{display:inline-flex;width:16px;height:16px;color:var(--accent);}
.sra-stat__icon svg{width:100%;height:100%;}
.sra-stat__label{font-family:var(--font-mono);font-size:10px;letter-spacing:var(--tracking-label);
  text-transform:uppercase;color:var(--text-secondary);}
.sra-stat__value{font-family:var(--font-mono);font-weight:var(--fw-bold);font-size:26px;color:var(--text);
  font-variant-numeric:tabular-nums;line-height:1;letter-spacing:-0.01em;}
.sra-stat__delta{font-family:var(--font-mono);font-size:11px;font-weight:var(--fw-medium);}
.sra-stat__delta--up{color:var(--success);}
.sra-stat__delta--down{color:var(--danger);}
`;
  document.head.appendChild(s);
}

/** Compact stat tile: label + big mono value (+ optional icon and delta). */
export function StatTile({ label, value, icon, delta, deltaDir = "up", className = "", ...props }) {
  return (
    <div className={["sra-stat", className].filter(Boolean).join(" ")} {...props}>
      <div className="sra-stat__top">
        {icon && <span className="sra-stat__icon">{icon}</span>}
        <span className="sra-stat__label">{label}</span>
      </div>
      <span className="sra-stat__value">{value}</span>
      {delta != null && (
        <span className={`sra-stat__delta sra-stat__delta--${deltaDir}`}>
          {deltaDir === "up" ? "▲" : "▼"} {delta}
        </span>
      )}
    </div>
  );
}
