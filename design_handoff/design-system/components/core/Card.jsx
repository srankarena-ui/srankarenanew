import React from "react";

if (typeof document !== "undefined" && !document.getElementById("sra-card-css")) {
  const s = document.createElement("style");
  s.id = "sra-card-css";
  s.textContent = `
.sra-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-xl);
  box-shadow:var(--shadow-sm);color:var(--text);position:relative;
  transition:transform var(--dur) var(--ease-out),border-color var(--dur) var(--ease-out),box-shadow var(--dur) var(--ease-out);}
.sra-card--pad-none{padding:0;}
.sra-card--pad-sm{padding:var(--space-3);}
.sra-card--pad-md{padding:var(--space-5);}
.sra-card--pad-lg{padding:var(--space-6);}
.sra-card--hover:hover{transform:translateY(-3px);border-color:var(--border-strong);box-shadow:var(--shadow-lg);}
.sra-card--interactive{cursor:pointer;}
.sra-card--interactive:hover{border-color:var(--accent);box-shadow:var(--shadow-glow);}
.sra-card--interactive:active{transform:translateY(0) scale(.995);}
.sra-card--inset{background:var(--surface-inset);}
`;
  document.head.appendChild(s);
}

/**
 * Card — the universal surface container.
 * padding: none | sm | md | lg
 */
export function Card({
  as = "div",
  padding = "md",
  hover = false,
  interactive = false,
  inset = false,
  className = "",
  children,
  ...props
}) {
  const Comp = as;
  const cls = [
    "sra-card",
    `sra-card--pad-${padding}`,
    hover ? "sra-card--hover" : "",
    interactive ? "sra-card--interactive" : "",
    inset ? "sra-card--inset" : "",
    className,
  ].filter(Boolean).join(" ");
  return <Comp className={cls} {...props}>{children}</Comp>;
}
