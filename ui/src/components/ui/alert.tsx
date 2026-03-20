import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type AlertVariant = "warning" | "danger" | "success" | "info";

export function Alert({
  variant,
  children,
  className,
  role = "status",
}: {
  variant: AlertVariant;
  children: ReactNode;
  className?: string;
  role?: "alert" | "status";
}) {
  return (
    <div className={cn("alert", `alert--${variant}`, className)} role={role}>
      {children}
    </div>
  );
}
