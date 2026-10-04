import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ConfirmModal';

export default function Privacy() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const sections = [
    {
      title: 'Data We Collect',
      icon: 'database',
      items: [
        'Profile information (name, age, gender, fitness metrics)',
        'Workout logs, nutrition data, and health metrics',
        'App usage patterns and preferences',
        'Device information for optimization',
      ],
    },
    {
      title: 'How We Use It',
      icon: 'psychology',
      items: [
        'Personalize your AI workout and nutrition recommendations',
        'Generate progress reports and transformation analytics',
        'Improve our AI models for better coaching accuracy',
        'Send relevant fitness notifications and reminders',
      ],
    },
    {
      title: 'Data Protection',
      icon: 'shield',
      items: [
        'All data encrypted at rest and in transit (AES-256)',
        'GDPR and CCPA compliant data handling',
        'No selling of personal data to third parties',
        'Regular security audits and penetration testing',
      ],
    },
    {
      title: 'Your Rights',
      icon: 'gavel',
      items: [
        'Request a full export of your data at any time',
        'Delete all your data permanently',
        'Opt out of AI model training with your data',
        'Control notification preferences granularly',
      ],
    },
  ];

  return (
    <main className="max-w-lg mx-auto px-6 pt-8 pb-32 space-y-8">
      <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-colors">
        <span className="material-symbols-outlined">arrow_back</span>
      </button>

      <header>
        <p className="text-primary font-label font-bold tracking-widest uppercase text-[10px] mb-2">Legal</p>
        <h1 className="font-headline font-extrabold text-4xl tracking-tighter">Privacy & Security</h1>
        <p className="text-on-surface-variant text-sm mt-2">Last updated: April 2026</p>
      </header>

      {/* Trust badges */}
      <div className="flex gap-3">
        {[
          { label: 'GDPR', icon: 'verified_user', color: '#6FFB85' },
          { label: 'Encrypted', icon: 'lock', color: '#FF7A00' },
          { label: 'No Ads', icon: 'block', color: '#fab0ff' },
        ].map((badge, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl bg-[var(--color-surface-container)] border border-white/5">
            <span className="material-symbols-outlined text-lg" style={{ color: badge.color, fontVariationSettings: "'FILL' 1" }}>{badge.icon}</span>
            <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">{badge.label}</span>
          </div>
        ))}
      </div>

      {/* Sections */}
      {sections.map((section, i) => (
        <div key={i} className="bg-[var(--color-surface-container)] rounded-[2rem] p-6 border border-white/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-lg">{section.icon}</span>
            </div>
            <h3 className="font-headline font-bold text-lg">{section.title}</h3>
          </div>
          <div className="space-y-3">
            {section.items.map((item, ii) => (
              <div key={ii} className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-sm mt-0.5 flex-shrink-0">check_circle</span>
                <p className="text-sm text-white/80 leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Actions */}
      <div className="space-y-3">
        <button onClick={() => showToast('Data export initiated. You will receive an email shortly.', 'success')} className="w-full flex items-center justify-between p-5 bg-[var(--color-surface-container)] rounded-2xl border border-white/5 hover:bg-white/5 transition-colors active:scale-[0.98]">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">download</span>
            <span className="font-headline font-bold text-sm">Export My Data</span>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant text-sm">chevron_right</span>
        </button>
        <button onClick={() => setShowDeleteConfirm(true)} className="w-full flex items-center justify-between p-5 bg-[var(--color-surface-container)] rounded-2xl border border-white/5 hover:bg-white/5 transition-colors active:scale-[0.98]">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#FF4D4D]">delete_forever</span>
            <span className="font-headline font-bold text-sm text-[#FF4D4D]">Delete All My Data</span>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant text-sm">chevron_right</span>
        </button>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onConfirm={() => { setShowDeleteConfirm(false); showToast('Data deletion process started.', 'info'); }}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Delete All Data?"
        message="This will permanently delete all your fitness data, meal logs, and workout history. This action cannot be undone."
        confirmLabel="Delete Everything"
        variant="danger"
      />
    </main>
  );
}
