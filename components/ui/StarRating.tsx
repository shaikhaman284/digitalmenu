'use client';

import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number;
  onChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  count?: number;
}

const sizeMap = {
  sm: 14,
  md: 18,
  lg: 24,
};

export function StarRating({
  value,
  onChange,
  readonly = false,
  size = 'md',
  showCount = false,
  count = 0,
}: StarRatingProps) {
  const starSize = sizeMap[size];

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => !readonly && onChange?.(star)}
          disabled={readonly}
          className={`
            transition-all duration-150
            ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110 active:scale-95'}
          `}
          aria-label={readonly ? `${value} stars` : `Rate ${star} stars`}
        >
          <Star
            size={starSize}
            className={`transition-colors duration-150 ${
              star <= Math.round(value)
                ? 'fill-amber-400 text-amber-400'
                : 'fill-transparent text-stone-300'
            }`}
          />
        </button>
      ))}
      {showCount && (
        <span style={{ fontSize: '0.75rem', color: 'var(--db-text-muted, #9c8e7a)', marginLeft: 2 }}>
          ({count})
        </span>
      )}
    </div>
  );
}
