import { useRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "./use-focus-trap";

/** Full-viewport overlay; click closes when `onBackdropClick` runs. */
export function ModalRoot({
  onBackdropClick,
  children,
  className,
}: {
  onBackdropClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("modal", className)}
      onClick={onBackdropClick}
      role="presentation"
    >
      {children}
    </div>
  );
}

type ModalPanelProps = HTMLAttributes<HTMLDivElement> & {
  /** Stop clicks on panel from closing the modal. */
  stopPropagation?: boolean;
  /** Move focus inside the panel and keep Tab cycling (default on). */
  trapFocus?: boolean;
  /** Called on Escape (when focus trap is active). */
  onEscape?: () => void;
};

export function ModalPanel({
  className,
  stopPropagation = true,
  trapFocus = true,
  onEscape,
  onClick,
  children,
  role = "dialog",
  "aria-modal": ariaModal = true,
  ...rest
}: ModalPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, { enabled: trapFocus, onEscape });

  return (
    <div
      ref={panelRef}
      className={cn("modal__content", className)}
      role={role}
      aria-modal={ariaModal}
      onClick={
        stopPropagation
          ? (e) => {
              e.stopPropagation();
              onClick?.(e);
            }
          : onClick
      }
      {...rest}
    >
      {children}
    </div>
  );
}

export function ModalTitle({
  as: Tag = "h2",
  id,
  className,
  children,
}: {
  as?: "h2" | "h3";
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag id={id} className={cn("modal__title", className)}>
      {children}
    </Tag>
  );
}

export function ModalBody({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("modal__body", className)}>{children}</div>;
}

export function ModalActions({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("modal__actions", className)}>{children}</div>;
}
