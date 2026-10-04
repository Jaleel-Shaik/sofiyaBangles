"use client";

import { useState } from "react";
import { Star } from "lucide-react";

export interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  interactive?: boolean;
  onChange?: (rating: number) => void;
  showText?: boolean;
  textPosition?: "right" | "bottom";
  className?: string;
  badge?: boolean;
  iconClassName?: string;
}

export function StarRating({
  rating,
  maxStars = 5,
  size = "sm",
  interactive = false,
  onChange,
  showText = true,
  textPosition = "right",
  className = "",
  badge = false,
  iconClassName = "",
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const activeRating = hoverRating !== null ? hoverRating : rating;

  const sizeClasses = {
    xs: "w-3 h-3",
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-5 h-5",
    xl: "w-6 h-6",
  };

  const textClasses = {
    xs: "text-[10px]",
    sm: "text-xs font-black",
    md: "text-xs font-black",
    lg: "text-sm font-black",
    xl: "text-base font-black",
  };

  const currentSizeClass = sizeClasses[size] || sizeClasses.sm;
  const currentTextClass = textClasses[size] || textClasses.sm;

  const content = (
    <div
      className={`flex items-center gap-1 ${
        textPosition === "bottom" ? "flex-col" : ""
      } ${className}`}
    >
      <div className="flex items-center gap-0.5">
        {Array.from({ length: maxStars }).map((_, index) => {
          const starValue = index + 1;
          const isFilled = starValue <= activeRating;
          const isHalf = !isFilled && starValue - 0.5 <= activeRating;

          return (
            <button
              key={index}
              type="button"
              disabled={!interactive}
              onClick={() => interactive && onChange && onChange(starValue)}
              onMouseEnter={() => interactive && setHoverRating(starValue)}
              onMouseLeave={() => interactive && setHoverRating(null)}
              className={`${
                interactive
                  ? "cursor-pointer hover:scale-110 transition-transform p-0.5"
                  : "cursor-default"
              } focus:outline-none`}
              title={
                interactive
                  ? `Rate ${starValue} of ${maxStars} stars`
                  : `${rating}/${maxStars} stars`
              }
            >
              <Star
                className={`${currentSizeClass} ${
                  isFilled
                    ? "text-amber-500 fill-amber-500"
                    : isHalf
                    ? "text-amber-500 fill-amber-300"
                    : "text-slate-200 fill-slate-100"
                } transition-colors ${iconClassName}`}
              />
            </button>
          );
        })}
      </div>

      {showText && (
        <span className={`${currentTextClass} text-amber-900 ml-0.5`}>
          {Number(rating).toFixed(1).replace(/\.0$/, "")}/{maxStars}
        </span>
      )}
    </div>
  );

  if (badge) {
    return (
      <div className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
        {content}
      </div>
    );
  }

  return content;
}
