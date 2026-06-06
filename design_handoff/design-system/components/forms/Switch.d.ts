import * as React from "react";

/** Toggle switch for boolean settings (verification on/off, registration open, etc.). */
export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Controlled checked state. */
  checked?: boolean;
  /** Change handler. */
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  /** Optional trailing label. */
  label?: string;
  disabled?: boolean;
}

export declare function Switch(props: SwitchProps): React.JSX.Element;
