import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline" | "success" | "ai";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "border-transparent bg-[var(--accent)] text-[var(--accent-fg)]",
    secondary: "border-transparent bg-[var(--elevated)] text-[var(--primary-text)]",
    outline: "text-[var(--primary-text)] border border-[var(--border)]",
    success: "border-transparent bg-[var(--success)] text-[var(--success-fg)]",
    ai: "border-transparent bg-[var(--ai-accent)] text-[var(--ai-accent-fg)]",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
