'use client';

import { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, className = '', id, style, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {label && (
          <label htmlFor={inputId} className="db-label">
            {label}
            {props.required && <span style={{ color: 'var(--db-accent)', marginLeft: 3 }}>*</span>}
          </label>
        )}
        <div style={{ position: 'relative' }}>
          {leftIcon && (
            <div style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--db-text-muted)', pointerEvents: 'none' }}>
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`db-input ${error ? 'db-input-error' : ''} ${className}`}
            style={{
              paddingLeft: leftIcon ? 42 : undefined,
              ...(error ? { borderColor: 'var(--db-red)', boxShadow: '0 0 0 3px rgba(220,38,38,0.1)' } : {}),
              ...style,
            }}
            {...props}
          />
        </div>
        {error && <p style={{ fontSize: '0.78rem', color: 'var(--db-red)' }}>{error}</p>}
        {hint && !error && <p style={{ fontSize: '0.78rem', color: 'var(--db-text-muted)' }}>{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className = '', id, style, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {label && (
          <label htmlFor={inputId} className="db-label">
            {label}
            {props.required && <span style={{ color: 'var(--db-accent)', marginLeft: 3 }}>*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={`db-textarea ${className}`}
          style={{
            ...(error ? { borderColor: 'var(--db-red)', boxShadow: '0 0 0 3px rgba(220,38,38,0.1)' } : {}),
            ...style,
          }}
          {...props}
        />
        {error && <p style={{ fontSize: '0.78rem', color: 'var(--db-red)' }}>{error}</p>}
        {hint && !error && <p style={{ fontSize: '0.78rem', color: 'var(--db-text-muted)' }}>{hint}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, className = '', id, children, style, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {label && (
          <label htmlFor={inputId} className="db-label">
            {label}
            {props.required && <span style={{ color: 'var(--db-accent)', marginLeft: 3 }}>*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          className={`db-select ${className}`}
          style={{
            ...(error ? { borderColor: 'var(--db-red)' } : {}),
            ...style,
          }}
          {...props}
        >
          {children}
        </select>
        {error && <p style={{ fontSize: '0.78rem', color: 'var(--db-red)' }}>{error}</p>}
        {hint && !error && <p style={{ fontSize: '0.78rem', color: 'var(--db-text-muted)' }}>{hint}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
