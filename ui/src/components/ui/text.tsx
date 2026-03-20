import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type TextVariant = "body" | "muted" | "subtle" | "danger" | "success" | "primary";

const variantClass: Record<TextVariant, string> = {
  body: "",
  muted: "u-text-muted",
  subtle: "u-text-subtle",
  danger: "u-text-danger",
  success: "u-text-success",
  primary: "u-text-primary",
};

export type TextSize = "xs" | "sm" | "base" | "lg" | "xl";

const sizeClass: Record<TextSize, string> = {
  xs: "u-text-xs",
  sm: "u-text-sm",
  base: "",
  lg: "u-text-lg",
  xl: "u-text-xl",
};

export type TextProps = Omit<HTMLAttributes<HTMLElement>, "className"> & {
  as?: "p" | "span" | "div" | "label";
  variant?: TextVariant;
  size?: TextSize;
  className?: string;
  children: ReactNode;
};

/** Typography helper aligned with utility classes in `base.css`. */
export function Text({
  as: Tag = "p",
  variant = "body",
  size = "base",
  className,
  children,
  ...rest
}: TextProps) {
  return (
    <Tag className={cn(variantClass[variant], sizeClass[size], className)} {...rest}>
      {children}
    </Tag>
  );
}
