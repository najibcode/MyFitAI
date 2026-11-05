import { useEffect, useRef } from 'react';
import { AlertTriangle, HelpCircle, Info, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
}

/**
 * Athletic personal operating system confirm modal replacing native browser confirm() dialogs.
 * Native confirm() breaks Android Capacitor webviews and looks inconsistent
 * across platforms. This component uses the app's refined design tokens.
 */
export default function ConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
}: ConfirmModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const accentColor =
    variant === 'danger'
      ? '#FF453A'
      : variant === 'warning'
      ? '#FF8A00'
      : '#30D158';

  const renderIcon = () => {
    switch (variant) {
      case 'danger':
        return <AlertTriangle className="w-6 h-6 text-[#FF453A]" />;
      case 'warning':
        return <HelpCircle className="w-6 h-6 text-[#FF8A00]" />;
      default:
        return <Info className="w-6 h-6 text-[#30D158]" />;
    }
  };

  return (
    <div
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) onCancel();
      }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-[#151517] rounded-3xl max-w-sm w-full p-6 space-y-5 shadow-2xl border border-[#2A2A2D] animate-in zoom-in-95 duration-200 relative">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-[#6B6B70] hover:text-[#F5F5F5] transition-colors p-1"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto border"
          style={{
            backgroundColor: `${accentColor}15`,
            borderColor: `${accentColor}33`,
          }}
        >
          {renderIcon()}
        </div>

        {/* Content */}
        <div className="text-center space-y-1.5">
          <h3 className="font-headline font-bold text-lg text-[#F5F5F5] tracking-tight">
            {title}
          </h3>
          <p className="text-[#A1A1A6] text-xs leading-relaxed">
            {message}
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl bg-[#1E1E20] text-[#A1A1A6] hover:text-[#F5F5F5] font-headline font-bold text-xs uppercase tracking-wider border border-[#2A2A2D] hover:bg-[#2A2A2D] transition-colors active:scale-[0.98]"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl font-headline font-bold text-xs uppercase tracking-wider active:scale-[0.98] transition-all"
            style={{
              backgroundColor: accentColor,
              color: variant === 'danger' ? '#FFFFFF' : '#000000',
              boxShadow: `0 4px 16px ${accentColor}33`,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
