import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-mono font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-sky-500/40 bg-sky-500/15 text-sky-300",
        secondary:
          "border-slate-700 bg-slate-800/80 text-slate-300",
        success:
          "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
        warning:
          "border-amber-500/40 bg-amber-500/15 text-amber-300",
        destructive:
          "border-rose-500/40 bg-rose-500/15 text-rose-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
