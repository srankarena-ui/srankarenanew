import * as React from "react";

export type RankLetter = "F" | "E" | "D" | "C" | "B" | "A" | "S";

/** Player avatar — image or initials on a blue→cyan gradient. Optional rank ring. */
export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Display name; first two letters become the fallback initials. */
  name?: string;
  /** Image URL; falls back to initials when absent. */
  src?: string;
  /** @default "md" */
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /** @default "squircle" */
  shape?: "squircle" | "circle";
  /** Draw a colored ring tinted to this rank. */
  rank?: RankLetter;
}

export declare function Avatar(props: AvatarProps): React.JSX.Element;
