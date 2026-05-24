'use client';

import { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
}

const sizeMap = { sm: 400, md: 480, lg: 560, xl: 720 };

export function Modal({ isOpen, onClose, title, children, size = 'md', showCloseButton = true }: ModalProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      {/* Backdrop */}
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(28,22,17,0.45)', backdropFilter: 'blur(4px)' }}
        className="animate-fade-in"
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className="db-card animate-scale-in"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: sizeMap[size],
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: 20,
          boxShadow: '0 20px 60px rgba(28,22,17,0.16)',
        }}
      >
        {(title || showCloseButton) && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 16px', borderBottom: '1px solid var(--db-border)' }}>
            {title && <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--db-text)', fontFamily: 'var(--db-font-heading)' }}>{title}</h2>}
            {showCloseButton && (
              <button
                onClick={onClose}
                aria-label="Close modal"
                style={{ padding: 6, borderRadius: 8, border: 'none', background: 'var(--db-surface-2)', color: 'var(--db-text-muted)', cursor: 'pointer', lineHeight: 0, marginLeft: 'auto', transition: 'all 0.15s' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#fee2e2'; (e.currentTarget as HTMLElement).style.color = '#dc2626'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--db-surface-2)'; (e.currentTarget as HTMLElement).style.color = 'var(--db-text-muted)'; }}
              >
                <X size={17} />
              </button>
            )}
          </div>
        )}
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}
