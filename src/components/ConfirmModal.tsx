import { useEffect, useRef } from 'react';

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
 * Premium confirm modal replacing native browser confirm() dialogs.
 * Native confirm() breaks Android Capacitor webviews and looks inconsistent
 * across platforms. This component uses the app's design system tokens.
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
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const accentColor = variant === 'danger' ? '#FF4D4D' : variant === 'warning' ? '#FF7A00' : 'var(--color-primary)';

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onCancel(); }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-[var(--color-surface-container)] rounded-[2rem] max-w-sm w-full p-8 space-y-5 shadow-[0_40px_100px_rgba(0,0,0,0.5)] border border-white/[0.06] animate-in zoom-in-95 duration-200">
        {/* Icon */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
          style={{ backgroundColor: `${accentColor}15` }}
        >
          <span
            className="material-symbols-outlined text-3xl"
            style={{ color: accentColor, fontVariationSettings: "'FILL' 1" }}
          >
            {variant === 'danger' ? 'warning' : variant === 'warning' ? 'help' : 'info'}
          </span>
        </div>

        {/* Content */}
        <div className="text-center">
          <h3 className="font-headline font-bold text-lg tracking-tight mb-2">{title}</h3>
          <p className="text-on-surface-variant text-sm leading-relaxed">{message}</p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3.5 rounded-2xl bg-white/5 text-on-surface-variant font-bold text-sm border border-white/[0.06] hover:bg-white/10 transition-colors active:scale-[0.97]"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3.5 rounded-2xl font-bold text-sm active:scale-[0.97] transition-all"
            style={{
              backgroundColor: accentColor,
              color: variant === 'danger' ? '#fff' : '#000',
              boxShadow: `0 8px 24px ${accentColor}33`,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
