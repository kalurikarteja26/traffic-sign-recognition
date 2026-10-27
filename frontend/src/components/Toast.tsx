import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

type ToastListener = (toast: ToastMessage) => void;
const listeners: ToastListener[] = [];

export const toast = {
  success: (message: string, title = 'Operation Successful', duration = 3500) => {
    emit({ id: Math.random().toString(36).substring(2, 9), type: 'success', title, message, duration });
  },
  error: (message: string, title = 'System Alert', duration = 4500) => {
    emit({ id: Math.random().toString(36).substring(2, 9), type: 'error', title, message, duration });
  },
  warning: (message: string, title = 'Cautionary Notice', duration = 4000) => {
    emit({ id: Math.random().toString(36).substring(2, 9), type: 'warning', title, message, duration });
  },
  info: (message: string, title = 'Cockpit Telemetry', duration = 3500) => {
    emit({ id: Math.random().toString(36).substring(2, 9), type: 'info', title, message, duration });
  },
};

const emit = (toastItem: ToastMessage) => {
  listeners.forEach((listener) => listener(toastItem));
};

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handleToast = (newToast: ToastMessage) => {
      setToasts((prev) => [...prev, newToast]);
    };
    listeners.push(handleToast);
    return () => {
      const idx = listeners.indexOf(handleToast);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed top-4 right-4 sm:right-6 z-[9999] flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => removeToast(t.id)} />
      ))}
    </div>
  );
};

interface ToastItemProps {
  toast: ToastMessage;
  onDismiss: () => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, toast.duration || 3500);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  const config = {
    success: {
      bg: 'bg-[#091f1a]/95 border-emerald-500/50 text-emerald-300',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
      glow: 'shadow-[0_8px_30px_rgba(16,185,129,0.25)]',
      bar: 'bg-emerald-400',
    },
    error: {
      bg: 'bg-[#230f14]/95 border-red-500/50 text-red-300',
      icon: <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />,
      glow: 'shadow-[0_8px_30px_rgba(239,68,68,0.25)]',
      bar: 'bg-red-400',
    },
    warning: {
      bg: 'bg-[#241a0b]/95 border-amber-500/50 text-amber-300',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
      glow: 'shadow-[0_8px_30px_rgba(245,158,11,0.25)]',
      bar: 'bg-amber-400',
    },
    info: {
      bg: 'bg-[#08182b]/95 border-cyan-500/50 text-cyan-300',
      icon: <Info className="w-5 h-5 text-cyan-400 shrink-0" />,
      glow: 'shadow-[0_8px_30px_rgba(34,211,238,0.25)]',
      bar: 'bg-cyan-400',
    },
  }[toast.type];

  return (
    <div
      className={`pointer-events-auto rounded-xl border p-3.5 backdrop-blur-xl transition-all duration-300 animate-in fade-in slide-in-from-top-3 flex items-start gap-3 relative overflow-hidden ${config.bg} ${config.glow}`}
    >
      <div className="mt-0.5">{config.icon}</div>
      <div className="flex-1 min-w-0 pr-2">
        {toast.title && (
          <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-white">
            {toast.title}
          </h4>
        )}
        <p className="text-xs mt-0.5 leading-relaxed break-words">{toast.message}</p>
      </div>
      <button
        onClick={onDismiss}
        className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        aria-label="Close notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Expiry progress line */}
      <div
        className={`absolute bottom-0 inset-x-0 h-0.5 ${config.bar} opacity-60 animate-pulse`}
      />
    </div>
  );
};
