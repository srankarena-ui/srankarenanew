import React from "react";

if (typeof document !== "undefined" && !document.getElementById("sra-rankbadge-css")) {
  const s = document.createElement("style");
  s.id = "sra-rankbadge-css";
  s.textContent = `
.sra-rank{display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;
  font-family:var(--font-mono);font-weight:var(--fw-bold);line-height:1;
  border-radius:var(--radius-lg);background:var(--surface-2);
  border:1.5px solid color-mix(in srgb,var(--rank-color) 45%,transparent);color:var(--rank-color);}
.sra-rank--glow{box-shadow:0 0 18px -2px var(--rank-color);}
.sra-rank--sm{width:30px;height:30px;font-size:14px;border-radius:var(--radius-sm);}
.sra-rank--md{width:42px;height:42px;font-size:20px;}
.sra-rank--lg{width:60px;height:60px;font-size:30px;border-radius:var(--radius-xl);}
`;
  document.head.appendChild(s);
}

const RANK_VAR = { F: "--rank-f", E: "--rank-e", D: "--rank-d", C: "--rank-c", B: "--rank-b", A: "--rank-a", S: "--rank-s" };

/** Player rank badge (F → S), tinted to the rank's signature color. */
export function RankBadge({ rank = "F", size = "md", glow, className = "", style = {}, ...props }) {
  const color = `var(${RANK_VAR[rank] || "--rank-f"})`;
  const cls = ["sra-rank", `sra-rank--${size}`, glow ? "sra-rank--glow" : "", className].filter(Boolean).join(" ");
  return (
    <span className={cls} style={{ ...style, ["--rank-color"]: color }} {...props}>{rank}</span>
  );
}
