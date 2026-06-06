import * as React from "react";

/** Metadata chip for game/format/reward info, e.g. "5v5 · LoL" or "+250 EXP". */
export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** @default "default" */
  tone?: "default" | "accent" | "cyan" | "solid";
  /** Optional leading icon node (sized to 13px). */
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export declare function Tag(props: TagProps): React.JSX.Element;
