import * as React from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

/**
 * Primary action control for S-Rank Arena. Friendly mixed-case labels,
 * rounded corners, springy press, accent glow on the primary hover.
 *
 * @startingPoint section="Core" subtitle="Buttons in every variant & size" viewport="700x200"
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style. @default "primary" */
  variant?: ButtonVariant;
  /** Control height. @default "md" */
  size?: ButtonSize;
  /** Stretch to fill the container width. */
  fullWidth?: boolean;
  /** Show a spinner and disable interaction. */
  isLoading?: boolean;
  /** Icon node rendered before the label. */
  leftIcon?: React.ReactNode;
  /** Icon node rendered after the label. */
  rightIcon?: React.ReactNode;
  /** Render as another element/component, e.g. "a". @default "button" */
  as?: React.ElementType;
  children?: React.ReactNode;
}

export declare function Button(props: ButtonProps): React.JSX.Element;
