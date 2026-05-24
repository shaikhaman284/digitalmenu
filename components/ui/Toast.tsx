'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast { id: string; type: ToastType; message: string; }

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const iconMap = {
  success: <CheckCircle size={17} style={{ color: '#16a34a', flexShrink: 0 }} />,
  error:   <XCircle    size={17} style={{ color: '#dc2626', flexShrink: 0 }} />,
  warning: <AlertCircle size={17} style={{ color: '#d97706', flexShrink: 0 }} />,
  info:    <Info        size={17} style={{ color: '#2563eb', flexShrink: 0 }} />,
};

const styleMap: Record<ToastType, React.CSSProperties> = {
  success: { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d' },
  error:   { background: '#fff0f0', border: '1px solid #fecaca', color: '#dc2626' },
  warning: { background: '#fffbeb', border: '1px solid #fde68a', color: '#b45309' },
  info:    { background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => removeToast(id), 4000);
  }, [removeToast]);

  const value: ToastContextValue = {
    toast: addToast,
    success: (m) => addToast(m, 'success'),
    error:   (m) => addToast(m, 'error'),
    warning: (m) => addToast(m, 'warning'),
    info:    (m) => addToast(m, 'info'),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 100, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360, width: '100%', pointerEvents: 'none' }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            className="animate-slide-up"
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '12px 14px', borderRadius: 12,
              boxShadow: '0 4px 20px rgba(28,22,17,0.10)',
              pointerEvents: 'auto', fontFamily: "'Inter', system-ui, sans-serif",
              ...styleMap[t.type],
            }}
          >
            {iconMap[t.type]}
            <p style={{ fontSize: '0.875rem', flex: 1, fontWeight: 500 }}>{t.message}</p>
            <button
              onClick={() => removeToast(t.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', lineHeight: 0, opacity: 0.6, color: 'inherit', flexShrink: 0 }}
              aria-label="Dismiss"
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
