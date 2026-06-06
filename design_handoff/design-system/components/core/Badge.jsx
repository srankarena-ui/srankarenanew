import React from "react";

if (typeof document !== "undefined" && !document.getElementById("sra-badge-css")) {
  const s = document.createElement("style");
  s.id = "sra-badge-css";
  s.textContent = `
.sra-badge{display:inline-flex;align-items:center;gap:.45em;font-family:var(--font-mono);
  font-weight:var(--fw-medium);letter-spacing:var(--tracking-label);text-transform:uppercase;
  border-radius:var(--radius-pill);border:1px solid transparent;white-space:nowrap;line-height:1;}
.sra-badge--sm{font-size:9px;padding:4px 8px;}
.sra-badge--md{font-size:11px;padding:5px 11px;}
.sra-badge--default{background:var(--surface-3);color:var(--text-secondary);border-color:var(--border);}
.sra-badge--accent{background:var(--accent-soft);color:var(--accent);}
.sra-badge--success{background:var(--success-soft);color:var(--success);}
.sra-badge--warning{background:var(--warning-soft);color:var(--warning);}
.sra-badge--danger{background:var(--danger-soft);color:var(--danger);}
.sra-badge--info{background:var(--info-soft);color:var(--info);}
.sra-badge--outline{background:transparent;color:var(--text-secondary);border-color:var(--border-strong);}
.sra-badge__dot{width:.5em;height:.5em;border-radius:var(--radius-pill);background:currentColor;}
.sra-badge--pulse .sra-badge__dot{animation:sra-pulse 1.4s var(--ease-out) infinite;}
@keyframes sra-pulse{0%{box-shadow:0 0 0 0 currentColor;}70%{box-shadow:0 0 0 5px transparent;}100%{box-shadow:0 0 0 0 transparent;}}
`;
  document.head.appendChild(s);
}

/**
 * Badge — compact status pill (mono, uppercase). Optional live dot.
 * variant: default | accent | success | warning | danger | info | outline
 */
export function Badge({
  variant = "default",
  size = "md",
  dot = false,
  pulse = false,
  className = "",
  children,
  ...props
}) {
  const cls = [
    "sra-badge",
    `sra-badge--${variant}`,
    `sra-badge--${size}`,
    pulse ? "sra-badge--pulse" : "",
    className,
  ].filter(Boolean).join(" ");
  return (
    <span className={cls} {...props}>
      {(dot || pulse) && <span className="sra-badge__dot" />}
      {children}
    </span>
  );
}
