import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function NavMenu({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("nav__items", className)}>{children}</div>;
}

export function NavMenuItem({
  active,
  className,
  children,
  ...props
}: Omit<React.ComponentPropsWithoutRef<"button">, "className"> & {
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={cn("nav__item", active && "nav__item--active", className)}
      {...props}
    >
      {children}
    </button>
  );
}
