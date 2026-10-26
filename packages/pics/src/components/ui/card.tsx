import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type CardPadding = "none" | "md" | "lg";

export function Card({
  children,
  padding = "md",
  className,
}: {
  children: ReactNode;
  padding?: CardPadding;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "card",
        padding === "md" && "card--padding",
        padding === "lg" && "card--padding-lg",
        className,
      )}
    >
      {children}
    </div>
  );
}
