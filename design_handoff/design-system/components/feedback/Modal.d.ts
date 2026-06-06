import * as React from "react";

/** Centered modal dialog with overlay, header, scrollable body and optional footer. */
export interface ModalProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether the dialog is shown. @default true */
  open?: boolean;
  /** Close handler (overlay click, close button). Omit to hide the close button. */
  onClose?: () => void;
  /** Heading text. */
  title?: string;
  /** Sub-heading under the title. */
  subtitle?: string;
  /** @default "md" */
  size?: "sm" | "md" | "lg";
  /** Footer node, typically the action buttons. */
  footer?: React.ReactNode;
  children?: React.ReactNode;
}

export declare function Modal(props: ModalProps): React.JSX.Element;
