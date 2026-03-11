import React, { createContext, useContext, useState, useCallback, useMemo, useRef } from 'react';
import { COLORS } from '../constants/styles';
import { Check, X, AlertTriangle, Info } from 'lucide-react';
import type { ToastAPI, ToastItem, ToastOptions } from '../types/index';

const ToastContext = createContext<ToastAPI | null>(null);

let toastId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const removeToast = useCallback((id: number) => {
    clearTimeout(timersRef.current[id]);
    delete timersRef.current[id];
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(({ type = 'error', message, duration = 4000, action, actionLabel }: {
    type?: ToastItem['type']; message: string; duration?: number; action?: () => void; actionLabel?: string;
  }) => {
    const id = ++toastId;
    setToasts((prev) => [...prev.slice(-4), { id, type, message, action, actionLabel }]);
    if (duration > 0) {
      timersRef.current[id] = setTimeout(() => removeToast(id), duration);
    }
    return id;
  }, [removeToast]);

  const toast = useMemo<ToastAPI>(() => ({
    error: (message: string, opts?: ToastOptions) => addToast({ type: 'error', message, ...opts }),
    success: (message: string, opts?: ToastOptions) => addToast({ type: 'success', message, duration: 3000, ...opts }),
    warning: (message: string, opts?: ToastOptions) => addToast({ type: 'warning', message, ...opts }),
    info: (message: string, opts?: ToastOptions) => addToast({ type: 'info', message, duration: 3000, ...opts }),
  }), [addToast]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

const TOAST_ICON: Record<string, React.FC<{ size: number; color: string }>> = {
  error: X,
  success: Check,
  warning: AlertTriangle,
  info: Info,
};

const TOAST_COLOR: Record<string, string> = {
  error: COLORS.red,
  success: COLORS.green,
  warning: COLORS.amber,
  info: COLORS.teal,
};

function ToastContainer({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div role="status" aria-live="polite" style={{
      position: 'fixed', top: 60, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 400, padding: '0 20px',
      zIndex: 9999, pointerEvents: 'none',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {toasts.map((t) => {
        const color = TOAST_COLOR[t.type] || COLORS.red;
        const Icon = TOAST_ICON[t.type] || X;
        return (
          <div key={t.id} role="alert" style={{
            background: 'var(--bg-sheet)',
            border: '1px solid var(--border-md)',
            borderRadius: 14, padding: '12px 14px',
            display: 'flex', alignItems: 'center', gap: 10,
            pointerEvents: 'auto',
            animation: 'toastIn 0.3s cubic-bezier(0.16,1,0.3,1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: `${color}18`, display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Icon size={14} color={color} />
            </div>
            <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600, flex: 1, lineHeight: 1.4 }}>
              {t.message}
            </span>
            {t.action && (
              <button onClick={() => { t.action!(); onDismiss(t.id); }} style={{
                padding: '5px 12px', background: color, color: '#fff',
                border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700,
                cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
              }}>
                {t.actionLabel || 'Повторить'}
              </button>
            )}
            <button onClick={() => onDismiss(t.id)} style={{
              background: 'none', border: 'none', padding: 4, cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: 14, flexShrink: 0, lineHeight: 1,
              borderRadius: 6,
            }}>
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function useToast(): ToastAPI {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
