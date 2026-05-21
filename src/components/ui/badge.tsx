import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-zinc-800 text-zinc-200",
        success: "bg-emerald-900/50 text-emerald-300",
        warning: "bg-amber-900/50 text-amber-300",
        danger: "bg-red-900/50 text-red-300",
        info: "bg-blue-900/50 text-blue-300",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
