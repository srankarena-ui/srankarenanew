import React from "react";

if (typeof document !== "undefined" && !document.getElementById("sra-input-css")) {
  const s = document.createElement("style");
  s.id = "sra-input-css";
  s.textContent = `
.sra-field{display:flex;flex-direction:column;gap:7px;}
.sra-field__label{font-family:var(--font-mono);font-size:10px;font-weight:var(--fw-medium);
  letter-spacing:var(--tracking-label);text-transform:uppercase;color:var(--text-secondary);}
.sra-input-wrap{position:relative;display:flex;align-items:center;}
.sra-input-wrap__icon{position:absolute;left:14px;display:inline-flex;width:17px;height:17px;color:var(--text-muted);pointer-events:none;}
.sra-input-wrap__icon svg{width:100%;height:100%;}
.sra-input{width:100%;font-family:var(--font-sans);font-size:14px;font-weight:var(--fw-medium);
  color:var(--text);background:var(--surface-inset);border:1.5px solid var(--border);
  border-radius:var(--radius-md);padding:11px 14px;outline:none;
  transition:border-color var(--dur) var(--ease-out),box-shadow var(--dur) var(--ease-out);}
.sra-input::placeholder{color:var(--text-muted);}
.sra-input--icon{padding-left:40px;}
.sra-input:hover{border-color:var(--border-strong);}
.sra-input:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-ring);}
.sra-input--error{border-color:var(--danger);}
.sra-input--error:focus{box-shadow:0 0 0 3px var(--danger-soft);}
.sra-input:disabled{opacity:.55;cursor:not-allowed;}
.sra-field__msg{font-size:12px;color:var(--text-muted);}
.sra-field__msg--error{color:var(--danger);}
`;
  document.head.appendChild(s);
}

let _id = 0;

/** Text input with optional label, leading icon, hint and error. */
export function Input({
  label,
  hint,
  error,
  leftIcon,
  id,
  className = "",
  ...props
}) {
  const fieldId = id || `sra-input-${++_id}`;
  return (
    <div className="sra-field">
      {label && <label className="sra-field__label" htmlFor={fieldId}>{label}</label>}
      <div className="sra-input-wrap">
        {leftIcon && <span className="sra-input-wrap__icon">{leftIcon}</span>}
        <input
          id={fieldId}
          className={[
            "sra-input",
            leftIcon ? "sra-input--icon" : "",
            error ? "sra-input--error" : "",
            className,
          ].filter(Boolean).join(" ")}
          aria-invalid={error ? "true" : undefined}
          {...props}
        />
      </div>
      {(error || hint) && (
        <span className={`sra-field__msg ${error ? "sra-field__msg--error" : ""}`}>
          {error || hint}
        </span>
      )}
    </div>
  );
}
