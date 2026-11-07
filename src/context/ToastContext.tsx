// ─────────────────────────────────────────────────────────────
// MyFitAI — Global Athlete Toast Notification System
// Athletic Personal Operating System UI/UX
// ─────────────────────────────────────────────────────────────

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextProps {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[999] flex flex-col gap-2 pointer-events-none w-full max-w-sm px-4 items-center">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};

const ToastItem = ({ toast, onRemove }: { toast: ToastMessage; onRemove: (id: string) => void }) => {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 3500);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const renderIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-[#30D158] shrink-0" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-[#FF453A] shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-[#4F9CF9] shrink-0" />;
    }
  };

  return (
    <div className="bg-[#151517] border border-[#2A2A2D] rounded-2xl py-3 px-4 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200 pointer-events-auto w-fit max-w-full">
      {renderIcon()}
      <p className="text-xs font-semibold text-[#F5F5F5] flex-1 whitespace-normal">
        {toast.message}
      </p>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-[#6B6B70] hover:text-[#F5F5F5] transition-colors ml-1 shrink-0 p-0.5"
        aria-label="Dismiss toast"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
