import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

const gapPx = { 0: 0, 1: 4, 2: 8, 3: 16, 4: 24 } as const;

type StackProps = HTMLAttributes<HTMLDivElement> & {
  gap?: keyof typeof gapPx;
  direction?: "row" | "column";
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between";
  children: ReactNode;
};

const alignItems: Record<
  NonNullable<StackProps["align"]>,
  NonNullable<CSSProperties["alignItems"]>
> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
};

const justifyContent: Record<
  NonNullable<StackProps["justify"]>,
  NonNullable<CSSProperties["justifyContent"]>
> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  between: "space-between",
};

/** Flex column/row with consistent spacing (layout primitive). */
export function Stack({
  gap = 2,
  direction = "column",
  align = "stretch",
  justify = "start",
  className,
  style,
  children,
  ...rest
}: StackProps) {
  return (
    <div
      className={cn(className)}
      style={{
        display: "flex",
        flexDirection: direction === "row" ? "row" : "column",
        alignItems: alignItems[align],
        justifyContent: justifyContent[justify],
        gap: gapPx[gap],
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
