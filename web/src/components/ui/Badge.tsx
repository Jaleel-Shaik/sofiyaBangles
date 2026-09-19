import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  dot?: boolean;
  withDot?: boolean;
  leftIcon?: React.ReactNode;
}

export function Badge({
  children,
  variant = 'default',
  dot = false,
  withDot = false,
  leftIcon,
  className,
  ...props
}: BadgeProps) {
  const showDot = dot || withDot;
  const variants = {
    default: 'bg-slate-100 text-slate-700 border-slate-200/80',
    primary: 'bg-rose-50 text-[#E8436E] border-rose-200/70',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
    warning: 'bg-amber-50 text-amber-700 border-amber-200/70',
    danger: 'bg-rose-50 text-rose-700 border-rose-200/70',
    neutral: 'bg-slate-50 text-slate-600 border-slate-200/70',
  };

  const dotColors = {
    default: 'bg-slate-400',
    primary: 'bg-[#E8436E]',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    neutral: 'bg-slate-400',
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border select-none',
          variants[variant],
          className
        )
      )}
      {...props}
    >
      {showDot && (
        <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant])} aria-hidden="true" />
      )}
      {leftIcon && <span className="shrink-0">{leftIcon}</span>}
      <span>{children}</span>
    </span>
  );
}

export default Badge;
