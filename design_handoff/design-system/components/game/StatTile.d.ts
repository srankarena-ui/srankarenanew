import * as React from "react";

/** Compact stat tile for profile/standings grids: label + big mono value. */
export interface StatTileProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Mono uppercase label. */
  label: string;
  /** The headline value (string or number). */
  value: React.ReactNode;
  /** Optional leading icon node. */
  icon?: React.ReactNode;
  /** Optional change indicator text, e.g. "12%". */
  delta?: React.ReactNode;
  /** Direction of the delta. @default "up" */
  deltaDir?: "up" | "down";
}

export declare function StatTile(props: StatTileProps): React.JSX.Element;
