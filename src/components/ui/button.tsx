import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium select-none transition-[opacity,transform,background-color,color,box-shadow] duration-[var(--motion-quick)] ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-accent text-accent-fg shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_8%,transparent)] hover:opacity-90",
        secondary:
          "bg-surface-2 text-fg shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_12%,transparent)] hover:bg-surface",
        ghost: "bg-transparent text-fg hover:bg-surface-2",
        outline:
          "bg-transparent text-fg shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_16%,transparent)] hover:bg-surface-2",
        danger: "bg-danger text-fg hover:opacity-90",
      },
      size: {
        default: "h-11 rounded-[var(--radius-md)] px-4 text-sm",
        sm: "h-9 rounded-[var(--radius-sm)] px-3 text-sm",
        lg: "h-12 rounded-[var(--radius-md)] px-5 text-base",
        xl: "h-14 rounded-[var(--radius-lg)] px-6 text-lg tracking-wide",
        icon: "size-11 rounded-[var(--radius-md)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    /** Disable press-scale for dense chrome. */
    static?: boolean;
  };

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, static: isStatic, type, ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : (type ?? "button")}
        className={cn(
          buttonVariants({ variant, size }),
          !isStatic && "active:not-disabled:scale-[0.96]",
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
