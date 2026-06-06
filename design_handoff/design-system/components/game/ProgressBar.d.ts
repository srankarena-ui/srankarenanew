import * as React from "react";

/** Progress / XP bar with a blue→cyan gradient fill and optional header. */
export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Current value. */
  value?: number;
  /** Maximum value. @default 100 */
  max?: number;
  /** Mono uppercase label (left of the header row). */
  label?: string;
  /** Value text (right of the header row), e.g. "2,480 / 5,000 XP". */
  valueText?: string;
  /** Track height in px. @default 10 */
  height?: number;
}

export declare function ProgressBar(props: ProgressBarProps): React.JSX.Element;
