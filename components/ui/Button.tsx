'use client';

import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantMap: Record<Variant, string> = {
  primary:   'db-btn db-btn-primary',
  secondary: 'db-btn db-btn-secondary',
  danger:    'db-btn db-btn-danger',
  ghost:     'db-btn db-btn-ghost',
  outline:   'db-btn db-btn-outline',
};

const sizeMap: Record<Size, string> = {
  sm: 'db-btn-sm',
  md: 'db-btn-md',
  lg: 'db-btn-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      children,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`
          ${variantMap[variant]}
          ${sizeMap[size]}
          ${fullWidth ? 'db-btn-full' : ''}
          ${className}
        `}
        {...props}
      >
        {loading ? <Loader2 size={15} style={{ animation: 'spin 0.7s linear infinite' }} /> : leftIcon}
        {children}
        {!loading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
