import * as React from "react";
import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: "default" | "outline" | "ghost" | "ai" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "default", size = "default", asChild = false, ...props },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    
    // Using explicit Tailwind classes for the variants based on the CSS vars
    const variants = {
      default: "bg-[var(--accent)] text-[var(--accent-fg)] hover:opacity-90 shadow-sm",
      ai: "bg-[var(--ai-accent)] text-[var(--ai-accent-fg)] hover:opacity-90 shadow-sm transition-all shadow-[var(--ai-accent)]/20",
      outline: "border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--elevated)] text-[var(--primary-text)]",
      ghost: "hover:bg-[var(--elevated)] text-[var(--primary-text)]",
      secondary: "bg-[var(--elevated)] text-[var(--primary-text)] hover:opacity-80",
    };

    const sizes = {
      default: "h-10 px-4 py-2",
      sm: "h-9 rounded-md px-3 text-sm",
      lg: "h-11 rounded-md px-8 text-md",
      icon: "h-10 w-10",
    };

    return (
      <Comp
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-[var(--background)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ai-accent)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
