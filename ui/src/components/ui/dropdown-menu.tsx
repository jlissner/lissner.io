import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DropdownMenu({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("dropdown", className)}>{children}</div>;
}

export type DropdownMenuItemProps = Omit<ComponentPropsWithoutRef<"button">, "className"> & {
  variant?: "default" | "danger";
  className?: string;
};

export function DropdownMenuItem({
  variant = "default",
  className,
  type = "button",
  ...props
}: DropdownMenuItemProps) {
  return (
    <button
      type={type}
      className={cn(
        "dropdown__item",
        variant === "danger" && "dropdown__item--danger",
        className
      )}
      {...props}
    />
  );
}
