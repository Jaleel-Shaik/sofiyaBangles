"use client";

import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'accent';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      leftIcon,
      rightIcon,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-semibold transition-all duration-200 select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]';

    const variants = {
      primary:
        'bg-gradient-to-r from-[#E8436E] to-[#CC3366] text-white hover:brightness-105 shadow-sm shadow-[#E8436E]/20 hover:shadow-md hover:shadow-[#E8436E]/30',
      secondary:
        'bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200/80',
      outline:
        'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 hover:border-slate-300 shadow-2xs',
      ghost:
        'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900',
      destructive:
        'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 hover:border-rose-300',
      accent:
        'bg-slate-900 text-white hover:bg-slate-800 shadow-sm',
    };

    const sizes = {
      sm: 'text-xs px-3 py-1.5 min-h-[36px] rounded-lg gap-1.5',
      md: 'text-sm px-4 py-2.5 min-h-[44px] rounded-xl gap-2', // Meets 44px touch target
      lg: 'text-base px-6 py-3 min-h-[48px] rounded-2xl gap-2.5',
      icon: 'w-11 h-11 min-h-[44px] min-w-[44px] p-2.5 rounded-xl justify-center', // Standard 44x44px target
    };

    const isInteractionDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isInteractionDisabled}
        className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        {children && <span>{children}</span>}
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
