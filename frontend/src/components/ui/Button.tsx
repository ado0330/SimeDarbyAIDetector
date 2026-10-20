import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "outline" | "ghost" | "link";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading = false, disabled, children, ...props }, ref) => {
    const variants = {
      primary: "bg-teal-700 hover:bg-teal-800 text-white font-medium shadow-xs border border-teal-800 focus:ring-teal-500",
      secondary: "bg-white hover:bg-slate-50 text-slate-700 font-medium border border-slate-300 shadow-xs focus:ring-slate-400",
      danger: "bg-rose-700 hover:bg-rose-800 text-white font-medium shadow-xs border border-rose-800 focus:ring-rose-500",
      outline: "bg-transparent hover:bg-slate-100 text-slate-700 border border-slate-300 focus:ring-slate-400",
      ghost: "bg-transparent hover:bg-slate-100 text-slate-700 focus:ring-slate-400",
      link: "bg-transparent text-teal-700 hover:underline p-0 h-auto shadow-none",
    };

    const sizes = {
      sm: "h-8 px-2.5 text-xs rounded",
      md: "h-9 px-3.5 text-sm rounded-md",
      lg: "h-11 px-5 text-base rounded-md",
      icon: "h-9 w-9 p-0 flex items-center justify-center rounded-md",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center cursor-pointer select-none transition-colors duration-150 focus:outline-hidden focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
