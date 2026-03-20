import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Full-width strip (e.g. S3 warning). Uses existing `app__alert` styles. */
export function Banner({
  children,
  onDismiss,
  className,
}: {
  children: ReactNode;
  onDismiss?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("app__alert", className)} role="alert">
      <span>{children}</span>
      {onDismiss && (
        <button
          type="button"
          className="app__alert-dismiss"
          onClick={onDismiss}
          aria-label="Dismiss"
        >
          ×
        </button>
      )}
    </div>
  );
}
