import * as React from "react";

export type CardPadding = "none" | "sm" | "md" | "lg";

/**
 * Universal surface container — rounded, soft shadow, token-driven.
 * @startingPoint section="Core" subtitle="Surface container with hover/interactive states" viewport="700x260"
 */
export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  /** Element/component to render. @default "div" */
  as?: React.ElementType;
  /** Inner padding. @default "md" */
  padding?: CardPadding;
  /** Lift + stronger shadow on hover (for content cards). */
  hover?: boolean;
  /** Clickable affordance: cursor + accent border/glow on hover. */
  interactive?: boolean;
  /** Recessed inset background (for nested panels). */
  inset?: boolean;
  children?: React.ReactNode;
}

export declare function Card(props: CardProps): React.JSX.Element;
