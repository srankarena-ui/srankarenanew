import React from "react";

if (typeof document !== "undefined" && !document.getElementById("sra-progress-css")) {
  const s = document.createElement("style");
  s.id = "sra-progress-css";
  s.textContent = `
.sra-progress{display:flex;flex-direction:column;gap:7px;width:100%;}
.sra-progress__head{display:flex;justify-content:space-between;align-items:baseline;
  font-family:var(--font-mono);font-size:11px;}
.sra-progress__label{color:var(--text-secondary);letter-spacing:var(--tracking-label);text-transform:uppercase;font-size:10px;}
.sra-progress__val{color:var(--text);font-weight:var(--fw-bold);}
.sra-progress__track{width:100%;border-radius:var(--radius-pill);background:var(--surface-inset);
  border:1px solid var(--border);overflow:hidden;}
.sra-progress__fill{height:100%;border-radius:var(--radius-pill);
  background:linear-gradient(90deg,var(--accent),var(--accent-2));
  transition:width var(--dur-slow) var(--ease-out);}
`;
  document.head.appendChild(s);
}

/** XP / progress bar with optional label + value and a blue→cyan fill. */
export function ProgressBar({
  value = 0,
  max = 100,
  label,
  valueText,
  height = 10,
  className = "",
  ...props
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={["sra-progress", className].filter(Boolean).join(" ")} {...props}>
      {(label || valueText) && (
        <div className="sra-progress__head">
          {label && <span className="sra-progress__label">{label}</span>}
          {valueText && <span className="sra-progress__val">{valueText}</span>}
        </div>
      )}
      <div className="sra-progress__track" style={{ height }} role="progressbar" aria-valuenow={value} aria-valuemax={max}>
        <div className="sra-progress__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
