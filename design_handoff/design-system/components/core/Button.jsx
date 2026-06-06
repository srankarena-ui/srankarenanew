import React from "react";

/* Inject component CSS once (token-driven, supports hover/active/focus). */
if (typeof document !== "undefined" && !document.getElementById("sra-button-css")) {
  const s = document.createElement("style");
  s.id = "sra-button-css";
  s.textContent = `
.sra-btn{display:inline-flex;align-items:center;justify-content:center;gap:.5em;
  font-family:var(--font-sans);font-weight:var(--fw-bold);letter-spacing:-0.01em;
  border:1.5px solid transparent;border-radius:var(--radius-lg);cursor:pointer;
  white-space:nowrap;text-decoration:none;line-height:1;
  transition:background var(--dur) var(--ease-out),border-color var(--dur) var(--ease-out),
    color var(--dur) var(--ease-out),box-shadow var(--dur) var(--ease-out),transform var(--dur-fast) var(--ease-spring);}
.sra-btn:active{transform:scale(.97);}
.sra-btn[disabled],.sra-btn[aria-disabled="true"]{opacity:.5;cursor:not-allowed;transform:none;}
.sra-btn--full{width:100%;}
.sra-btn--sm{height:34px;padding:0 14px;font-size:13px;}
.sra-btn--md{height:42px;padding:0 18px;font-size:14px;}
.sra-btn--lg{height:52px;padding:0 26px;font-size:15px;border-radius:var(--radius-xl);}
.sra-btn--primary{background:var(--accent);color:var(--text-onaccent);}
.sra-btn--primary:hover:not([disabled]){background:var(--accent-hover);box-shadow:var(--shadow-glow);}
.sra-btn--primary:active:not([disabled]){background:var(--accent-press);}
.sra-btn--secondary{background:var(--surface-2);color:var(--text);border-color:var(--border-strong);}
.sra-btn--secondary:hover:not([disabled]){border-color:var(--accent);color:var(--text);}
.sra-btn--ghost{background:transparent;color:var(--text-secondary);}
.sra-btn--ghost:hover:not([disabled]){background:var(--accent-soft);color:var(--accent);}
.sra-btn--danger{background:var(--danger-soft);color:var(--danger);border-color:color-mix(in srgb,var(--danger) 45%,transparent);}
.sra-btn--danger:hover:not([disabled]){background:color-mix(in srgb,var(--danger) 22%,transparent);}
.sra-btn__spin{width:1.05em;height:1.05em;animation:sra-spin .7s linear infinite;}
@keyframes sra-spin{to{transform:rotate(360deg);}}
`;
  document.head.appendChild(s);
}

/**
 * Button — the primary action control.
 * variant: primary | secondary | ghost | danger
 * size: sm | md | lg
 */
export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  isLoading = false,
  leftIcon,
  rightIcon,
  as = "button",
  className = "",
  children,
  disabled,
  ...props
}) {
  const Comp = as;
  const cls = [
    "sra-btn",
    `sra-btn--${variant}`,
    `sra-btn--${size}`,
    fullWidth ? "sra-btn--full" : "",
    className,
  ].filter(Boolean).join(" ");

  return (
    <Comp
      className={cls}
      disabled={Comp === "button" ? disabled || isLoading : undefined}
      aria-disabled={disabled || isLoading || undefined}
      {...props}
    >
      {isLoading && (
        <svg className="sra-btn__spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
          <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}
      {!isLoading && leftIcon}
      {children}
      {!isLoading && rightIcon}
    </Comp>
  );
}
