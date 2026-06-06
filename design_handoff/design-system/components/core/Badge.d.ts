import * as React from "react";

export type BadgeVariant = "default" | "accent" | "success" | "warning" | "danger" | "info" | "outline";

/** Compact status pill — mono, uppercase. Optional live dot. */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** @default "default" */
  variant?: BadgeVariant;
  /** @default "md" */
  size?: "sm" | "md";
  /** Show a leading status dot. */
  dot?: boolean;
  /** Animated pulsing dot (e.g. LIVE). Implies dot. */
  pulse?: boolean;
  children?: React.ReactNode;
}

export declare function Badge(props: BadgeProps): React.JSX.Element;
