import React from "react";

if (typeof document !== "undefined" && !document.getElementById("sra-modal-css")) {
  const s = document.createElement("style");
  s.id = "sra-modal-css";
  s.textContent = `
.sra-modal__overlay{position:fixed;inset:0;z-index:var(--z-modal);display:flex;align-items:center;
  justify-content:center;padding:20px;background:var(--overlay);backdrop-filter:blur(6px);
  animation:sra-fade var(--dur) var(--ease-out);}
.sra-modal{position:relative;width:100%;background:var(--surface);border:1px solid var(--border);
  border-radius:var(--radius-2xl);box-shadow:var(--shadow-lg);
  animation:sra-pop var(--dur) var(--ease-spring);max-height:calc(100vh - 40px);
  display:flex;flex-direction:column;overflow:hidden;}
.sra-modal--sm{max-width:380px;} .sra-modal--md{max-width:520px;} .sra-modal--lg{max-width:720px;}
.sra-modal__head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;
  padding:var(--space-6) var(--space-6) var(--space-4);}
.sra-modal__title{margin:0;font-family:var(--font-sans);font-weight:var(--fw-bold);font-size:20px;
  letter-spacing:-0.02em;color:var(--text);}
.sra-modal__sub{margin:4px 0 0;font-size:13px;color:var(--text-secondary);}
.sra-modal__close{flex-shrink:0;width:32px;height:32px;border-radius:var(--radius-md);border:1px solid var(--border);
  background:var(--surface-2);color:var(--text-secondary);cursor:pointer;display:inline-flex;align-items:center;
  justify-content:center;transition:all var(--dur) var(--ease-out);}
.sra-modal__close:hover{color:var(--text);border-color:var(--border-strong);}
.sra-modal__body{padding:0 var(--space-6) var(--space-6);overflow:auto;}
.sra-modal__foot{display:flex;justify-content:flex-end;gap:10px;padding:var(--space-4) var(--space-6);
  border-top:1px solid var(--border);background:var(--surface-2);}
@keyframes sra-fade{from{opacity:0;}to{opacity:1;}}
@keyframes sra-pop{from{opacity:0;transform:translateY(10px) scale(.97);}to{opacity:1;transform:none;}}
`;
  document.head.appendChild(s);
}

/** Centered modal dialog with overlay, title, body and optional footer. */
export function Modal({ open = true, onClose, title, subtitle, size = "md", footer, children, className = "", ...props }) {
  if (!open) return null;
  return (
    <div className="sra-modal__overlay" onClick={onClose}>
      <div
        className={["sra-modal", `sra-modal--${size}`, className].filter(Boolean).join(" ")}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        {...props}
      >
        {(title || onClose) && (
          <div className="sra-modal__head">
            <div>
              {title && <h2 className="sra-modal__title">{title}</h2>}
              {subtitle && <p className="sra-modal__sub">{subtitle}</p>}
            </div>
            {onClose && (
              <button className="sra-modal__close" onClick={onClose} aria-label="Close">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg>
              </button>
            )}
          </div>
        )}
        <div className="sra-modal__body">{children}</div>
        {footer && <div className="sra-modal__foot">{footer}</div>}
      </div>
    </div>
  );
}
