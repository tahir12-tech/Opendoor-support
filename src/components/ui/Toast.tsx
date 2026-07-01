/* =====================================================================
   Toast — the bottom-centre confirmation toasts used across the app.
   useToast() returns a toast(message) function; the provider renders the
   stack in a portal, animating each in and auto-dismissing it.
   ===================================================================== */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import './Toast.css';

interface ToastItem {
  id: number;
  message: string;
  shown: boolean;
}

const ToastContext = createContext<(message: string) => void>(() => {});

const DURATION = 3200;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const toast = useCallback((message: string) => {
    const id = ++seq.current;
    setToasts((prev) => [...prev, { id, message, shown: false }]);
    // animate in on the next frame
    requestAnimationFrame(() => setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, shown: true } : t))));
    // dismiss
    window.setTimeout(() => setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, shown: false } : t))), DURATION);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), DURATION + 260);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastPortal toasts={toasts} />
    </ToastContext.Provider>
  );
}

function ToastPortal({ toasts }: { toasts: ToastItem[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <div className="toast-wrap">
      {toasts.map((t) => (
        <div key={t.id} className={`toast${t.shown ? ' is-in' : ''}`}>
          <Icon name="check" strokeWidth={2.4} />
          <span>{t.message}</span>
        </div>
      ))}
    </div>,
    document.body,
  );
}

export function useToast(): (message: string) => void {
  return useContext(ToastContext);
}
