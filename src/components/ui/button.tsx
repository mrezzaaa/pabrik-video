import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm border text-sm font-semibold uppercase tracking-[0.08em] transition-all disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        default:
          "border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-[0_0_28px_rgba(57,255,20,0.28)]",
        secondary:
          "border-border bg-secondary text-secondary-foreground hover:border-zinc-500 hover:bg-zinc-800",
        outline:
          "border-border bg-transparent text-foreground hover:border-primary/60 hover:bg-primary/10 hover:text-primary",
        ghost:
          "border-transparent bg-transparent text-muted-foreground hover:bg-white/5 hover:text-foreground",
        destructive:
          "border-destructive/60 bg-destructive/15 text-destructive hover:bg-destructive/25",
        hot: "border-hot bg-hot text-white hover:bg-hot/90 hover:shadow-[0_0_28px_rgba(255,46,147,0.3)]",
        link: "border-transparent bg-transparent text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 gap-1.5 px-3 text-[11px]",
        lg: "h-12 px-6 text-sm",
        xl: "h-14 px-8 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
