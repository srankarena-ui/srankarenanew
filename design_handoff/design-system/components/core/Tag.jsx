import React from "react";

if (typeof document !== "undefined" && !document.getElementById("sra-tag-css")) {
  const s = document.createElement("style");
  s.id = "sra-tag-css";
  s.textContent = `
.sra-tag{display:inline-flex;align-items:center;gap:6px;font-family:var(--font-mono);
  font-weight:var(--fw-medium);font-size:11px;letter-spacing:.02em;line-height:1;
  padding:5px 10px;border-radius:var(--radius-sm);background:var(--surface-3);
  color:var(--text-secondary);border:1px solid var(--border);}
.sra-tag--accent{background:var(--accent-soft);color:var(--accent);border-color:transparent;}
.sra-tag--cyan{background:var(--accent-2-soft);color:var(--accent-2);border-color:transparent;}
.sra-tag--solid{background:var(--surface-2);color:var(--text);}
.sra-tag__icon{display:inline-flex;width:13px;height:13px;}
.sra-tag__icon svg{width:100%;height:100%;}
`;
  document.head.appendChild(s);
}

/**
 * Tag — metadata chip for game/format/reward info ("5v5 · LoL", "+250 EXP").
 * tone: default | accent | cyan | solid
 */
export function Tag({ tone = "default", icon, className = "", children, ...props }) {
  const cls = ["sra-tag", tone !== "default" ? `sra-tag--${tone}` : "", className]
    .filter(Boolean).join(" ");
  return (
    <span className={cls} {...props}>
      {icon && <span className="sra-tag__icon">{icon}</span>}
      {children}
    </span>
  );
}
