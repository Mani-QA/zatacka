import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "h-11 w-full rounded-[var(--radius-md)] bg-surface-2 px-3 text-sm text-fg placeholder:text-subtle",
          "shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_14%,transparent)]",
          "transition-[box-shadow,background-color] duration-[var(--motion-quick)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70",
          "disabled:opacity-40",
          className,
        )}
        {...props}
        suppressHydrationWarning
      />
    );
  },
);
Input.displayName = "Input";
