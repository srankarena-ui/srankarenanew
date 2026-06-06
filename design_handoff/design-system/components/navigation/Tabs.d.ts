import * as React from "react";

export interface TabItem {
  /** Unique id, matched against `value`. */
  id: string;
  /** Visible label. */
  label: string;
  /** Optional leading icon node. */
  icon?: React.ReactNode;
  /** Optional trailing count (e.g. players registered). */
  count?: number;
}

/**
 * Segmented tab control (pill style, sliding accent).
 * @startingPoint section="Navigation" subtitle="Segmented tabs" viewport="700x130"
 */
export interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  tabs: TabItem[];
  /** Currently active tab id. */
  value: string;
  /** Called with the id of the clicked tab. */
  onChange?: (id: string) => void;
  /** Stretch tabs to fill the container. */
  block?: boolean;
}

export declare function Tabs(props: TabsProps): React.JSX.Element;
