"use client";

import React, { forwardRef } from 'react';
import { Search, X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { STRINGS } from '@/src/constants/strings';

export interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
  containerClassName?: string;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onChange, onClear, placeholder = STRINGS.common.search, className, containerClassName = '', ...props }, ref) => {
    const hasValue = Boolean(value && String(value).length > 0);

    return (
      <div className={twMerge('relative flex items-center flex-1', containerClassName)}>
        <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" aria-hidden="true" />

        <input
          ref={ref}
          type="search"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          aria-label={placeholder}
          className={twMerge(
            clsx(
              'w-full min-h-[44px] pl-10 pr-10 py-2.5 text-sm font-medium text-slate-900 bg-white border border-slate-200 rounded-xl outline-none transition-all duration-200 focus:border-[#E8436E] focus:ring-2 focus:ring-rose-500/15 hover:border-slate-300',
              className
            )
          )}
          {...props}
        />

        {hasValue && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2.5 w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
            aria-label={STRINGS.common.clearSearch}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';

export default SearchInput;
