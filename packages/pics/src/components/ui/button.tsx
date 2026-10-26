import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "danger" | "success" | "ghost";
type ButtonSize = "default" | "sm";

type ButtonProps = Omit<
  React.ComponentPropsWithoutRef<"button">,
  "className"
> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
};

const variantClass: Record<ButtonVariant, string> = {
  primary: "btn btn--primary",
  secondary: "btn btn--secondary",
  danger: "btn btn--danger",
  success: "btn btn--success",
  ghost: "btn btn--ghost",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "default",
      className,
      type = "button",
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          variantClass[variant],
          size === "sm" && "btn--sm",
          className,
        )}
        {...props}
      />
    );
  },
);
