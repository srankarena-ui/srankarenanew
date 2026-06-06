import React from "react";

if (typeof document !== "undefined" && !document.getElementById("sra-switch-css")) {
  const s = document.createElement("style");
  s.id = "sra-switch-css";
  s.textContent = `
.sra-switch{display:inline-flex;align-items:center;gap:11px;cursor:pointer;user-select:none;font-family:var(--font-sans);}
.sra-switch input{position:absolute;opacity:0;width:0;height:0;}
.sra-switch__track{width:42px;height:24px;border-radius:var(--radius-pill);background:var(--surface-3);
  border:1.5px solid var(--border-strong);position:relative;flex-shrink:0;
  transition:background var(--dur) var(--ease-out),border-color var(--dur) var(--ease-out);}
.sra-switch__thumb{position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:var(--radius-pill);
  background:var(--text-secondary);transition:transform var(--dur) var(--ease-spring),background var(--dur) var(--ease-out);}
.sra-switch input:checked + .sra-switch__track{background:var(--accent);border-color:var(--accent);}
.sra-switch input:checked + .sra-switch__track .sra-switch__thumb{transform:translateX(18px);background:#fff;}
.sra-switch input:focus-visible + .sra-switch__track{box-shadow:0 0 0 3px var(--accent-ring);}
.sra-switch input:disabled + .sra-switch__track{opacity:.5;}
.sra-switch__label{font-size:14px;font-weight:var(--fw-medium);color:var(--text);}
`;
  document.head.appendChild(s);
}

/** Toggle switch for on/off settings. */
export function Switch({ checked, onChange, label, disabled, className = "", ...props }) {
  return (
    <label className={["sra-switch", className].filter(Boolean).join(" ")}>
      <input type="checkbox" role="switch" checked={checked} onChange={onChange} disabled={disabled} {...props} />
      <span className="sra-switch__track"><span className="sra-switch__thumb" /></span>
      {label && <span className="sra-switch__label">{label}</span>}
    </label>
  );
}
