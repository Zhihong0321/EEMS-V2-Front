import { forwardRef, type ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

const buttonVariants = {
  variant: {
    primary: "bg-primary text-white shadow-sm hover:bg-cyan-600 hover:shadow-md active:scale-95",
    secondary: "border border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800 hover:border-slate-600",
    ghost: "hover:bg-slate-800/50 text-slate-300 hover:text-white",
    danger: "bg-danger text-white shadow-sm hover:bg-red-600 hover:shadow-md active:scale-95",
    success: "bg-success text-white shadow-sm hover:bg-green-600 hover:shadow-md active:scale-95",
  },
  size: {
    sm: "px-3 py-1.5 text-xs min-h-[36px]",
    md: "px-4 py-2 text-sm min-h-[44px]",
    lg: "px-6 py-3 text-base min-h-[48px]",
  },
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonVariants.variant;
  size?: keyof typeof buttonVariants.size;
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = "primary", 
    size = "md", 
    isLoading, 
    children, 
    disabled, 
    ...props 
  }, ref) => {
    return (
      <button
        className={clsx(
          // Base styles
          "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
          "disabled:pointer-events-none disabled:opacity-50",
          // Variant styles
          buttonVariants.variant[variant],
          // Size styles
          buttonVariants.size[size],
          // Custom className
          className
        )}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        <span className={isLoading ? 'opacity-70' : ''}>{children}</span>
      </button>
    );
  }
);

Button.displayName = "Button";

