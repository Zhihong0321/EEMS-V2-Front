import { forwardRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';

const cardVariants = {
  default: "bg-slate-900/60",
  elevated: "bg-slate-900 shadow-lg",
  interactive: "cursor-pointer hover:border-primary-700 hover:shadow-lg",
  flat: "shadow-none",
};

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof cardVariants;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          "rounded-xl border border-slate-800 backdrop-blur-sm shadow-md transition-shadow duration-200",
          cardVariants[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx("p-4 sm:p-6 border-b border-slate-800", className)}
      {...props}
    />
  )
);
CardHeader.displayName = "CardHeader";

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={clsx("p-4 sm:p-6", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx("p-4 sm:p-6 border-t border-slate-800", className)}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";

