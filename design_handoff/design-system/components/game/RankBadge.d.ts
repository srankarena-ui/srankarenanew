import * as React from "react";

export type RankLetter = "F" | "E" | "D" | "C" | "B" | "A" | "S";

/**
 * Player rank badge (F → S), tinted to the rank's signature color.
 * @startingPoint section="Game" subtitle="Rank badges, XP bars & stat tiles" viewport="700x260"
 */
export interface RankBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** @default "F" */
  rank?: RankLetter;
  /** @default "md" */
  size?: "sm" | "md" | "lg";
  /** Add a colored glow (use for the player's current/own rank). */
  glow?: boolean;
}

export declare function RankBadge(props: RankBadgeProps): React.JSX.Element;
