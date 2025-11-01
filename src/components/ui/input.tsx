import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  success?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, success, ...props }, ref) => {
    return (
      <input
        className={clsx(
          "w-full rounded-md border px-3 py-2 text-sm text-white transition-colors duration-150",
          "placeholder:text-slate-500",
          "focus:outline-none focus:ring-2",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          error
            ? "border-danger bg-danger/5 focus:border-danger focus:ring-danger/20"
            : success
            ? "border-success bg-success/5 focus:border-success focus:ring-success/20"
            : "border-slate-800 bg-slate-950/60 focus:border-primary focus:ring-primary/20",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

// Select component
export interface SelectProps extends InputHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  success?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, success, children, ...props }, ref) => {
    return (
      <select
        className={clsx(
          "w-full rounded-md border px-3 py-2 text-sm text-white transition-colors duration-150",
          "focus:outline-none focus:ring-2",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          error
            ? "border-danger bg-danger/5 focus:border-danger focus:ring-danger/20"
            : success
            ? "border-success bg-success/5 focus:border-success focus:ring-success/20"
            : "border-slate-800 bg-slate-950/60 focus:border-primary focus:ring-primary/20",
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = "Select";

// Input wrapper with label and error
export interface InputWrapperProps {
  label: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  children: ReactNode;
}

export function InputWrapper({ 
  label, 
  error, 
  helperText, 
  required, 
  children 
}: InputWrapperProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-300">
        {label}
        {required && <span className="text-danger ml-1">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs text-danger flex items-center gap-1">
          <ExclamationTriangleIcon className="h-4 w-4" aria-hidden="true" />
          {error}
        </p>
      )}
      {!error && helperText && (
        <p className="text-xs text-slate-500">{helperText}</p>
      )}
    </div>
  );
}

