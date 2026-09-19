import React from 'react';
import { Package } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-12 bg-white rounded-3xl border border-dashed border-slate-200/90 shadow-2xs ${className}`}
    >
      <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100/80 text-[#E8436E] flex items-center justify-center mb-4 shadow-xs">
        {icon || <Package className="w-8 h-8" />}
      </div>

      <h3 className="text-base font-bold text-slate-900 tracking-tight mb-1.5">
        {title}
      </h3>

      <p className="text-xs text-slate-500 font-medium max-w-sm leading-relaxed mb-6">
        {description}
      </p>

      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary" size="md">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export default EmptyState;
