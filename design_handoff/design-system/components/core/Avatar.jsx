import React from "react";

if (typeof document !== "undefined" && !document.getElementById("sra-avatar-css")) {
  const s = document.createElement("style");
  s.id = "sra-avatar-css";
  s.textContent = `
.sra-avatar{display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;
  position:relative;font-family:var(--font-sans);font-weight:var(--fw-bold);color:#fff;
  background:linear-gradient(140deg,var(--accent),var(--accent-2));overflow:hidden;
  border-radius:var(--radius-lg);}
.sra-avatar img{width:100%;height:100%;object-fit:cover;}
.sra-avatar--circle{border-radius:var(--radius-pill);}
.sra-avatar--xs{width:28px;height:28px;font-size:11px;border-radius:var(--radius-sm);}
.sra-avatar--sm{width:36px;height:36px;font-size:14px;}
.sra-avatar--md{width:48px;height:48px;font-size:18px;}
.sra-avatar--lg{width:64px;height:64px;font-size:24px;border-radius:var(--radius-xl);}
.sra-avatar--xl{width:88px;height:88px;font-size:32px;border-radius:var(--radius-2xl);}
.sra-avatar--ring{box-shadow:0 0 0 2px var(--surface),0 0 0 4px var(--ring-color,var(--accent));}
`;
  document.head.appendChild(s);
}

const RANK_VAR = { F: "--rank-f", E: "--rank-e", D: "--rank-d", C: "--rank-c", B: "--rank-b", A: "--rank-a", S: "--rank-s" };

/**
 * Avatar — player image or initials. Optional colored ring by rank.
 * size: xs | sm | md | lg | xl
 */
export function Avatar({
  name = "",
  src,
  size = "md",
  shape = "squircle",
  rank,
  className = "",
  style = {},
  ...props
}) {
  const initials = name.trim().slice(0, 2).toUpperCase() || "?";
  const ringColor = rank ? `var(${RANK_VAR[rank] || "--accent"})` : undefined;
  const cls = [
    "sra-avatar",
    `sra-avatar--${size}`,
    shape === "circle" ? "sra-avatar--circle" : "",
    rank ? "sra-avatar--ring" : "",
    className,
  ].filter(Boolean).join(" ");
  return (
    <span className={cls} style={{ ...style, ...(ringColor ? { ["--ring-color"]: ringColor } : {}) }} {...props}>
      {src ? <img src={src} alt={name} /> : initials}
    </span>
  );
}
