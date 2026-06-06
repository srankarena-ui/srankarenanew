import * as React from "react";

/**
 * Text input with optional label, leading icon, hint and error message.
 * @startingPoint section="Forms" subtitle="Inputs & toggles" viewport="700x320"
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Mono uppercase field label above the control. */
  label?: string;
  /** Helper text shown below (hidden when `error` is set). */
  hint?: string;
  /** Error message; turns the field red and overrides hint. */
  error?: string;
  /** Leading icon node (sized to 17px). */
  leftIcon?: React.ReactNode;
}

export declare function Input(props: InputProps): React.JSX.Element;
