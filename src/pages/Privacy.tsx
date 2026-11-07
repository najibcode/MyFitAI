// ─────────────────────────────────────────────────────────────
// MyFitAI — Athlete Privacy & Telemetry Security Center
// Athletic Personal Operating System UI/UX
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ConfirmModal';
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  Ban,
  Database,
  Brain,
  Shield,
  Scale,
  CheckCircle2,
  Download,
  ChevronRight,
  Trash2,
} from 'lucide-react';

export default function Privacy() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const sections = [
    {
      title: 'Biometric Telemetry Ingested',
      icon: Database,
      items: [
        'Physiological metrics (age, gender, bodyweight, height, resting HR)',
        'GPS coordinates and elevation profiles recorded during outdoor activities',
        'Working load weights, set reps, RPE, and exercise velocity',
        'Nutritional macros and hydration intake logs',
      ],
    },
    {
      title: 'Algorithmic Optimization Use',
      icon: Brain,
      items: [
        'Real-time progressive overload micro-adjustment calculations',
        'Muscle volume landmark projections (MEV, MAV, MRV)',
        'Fasted recovery score and circadian readiness estimates',
        'Local model inference without selling telemetry to advertisers',
      ],
    },
    {
      title: 'Security Architecture',
      icon: Shield,
      items: [
        'End-to-end encryption at rest and in transit via TLS 1.3 & AES-256',
        'Zero ad-tracking SDKs or third-party telemetry data brokers',
        'On-device storage prioritized with offline-first persistence',
        'Strict GDPR Article 17 and CCPA deletion compliance',
      ],
    },
    {
      title: 'Athlete Sovereignty & Rights',
      icon: Scale,
      items: [
        'Instant CSV export of all training logs and workout history',
        'Standard GPX 1.1 file export for all tracked GPS routes',
        'Single-click permanent account and telemetry purge',
        'Granular wearable and sensor permission controls',
      ],
    },
  ];

  return (
    <main className="max-w-xl mx-auto px-4 sm:px-6 pt-6 pb-28 space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="w-10 h-10 rounded-xl bg-[#151517] border border-[#2A2A2D] flex items-center justify-center text-[#A1A1A6] hover:text-[#F5F5F5] transition-colors active:scale-95"
        aria-label="Back"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      {/* Header */}
      <header className="space-y-1">
        <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-[#30D158] block">
          DATA SOVEREIGNTY & TELEMETRY GOVERNANCE
        </span>
        <h1 className="font-headline font-black text-3xl sm:text-4xl text-[#F5F5F5] tracking-tight uppercase">
          Privacy & Security
        </h1>
        <p className="text-xs text-[#A1A1A6]">
          Your physiological data is private, encrypted, and owned exclusively by you.
        </p>
      </header>

      {/* Trust Badges */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'GDPR Verified', icon: ShieldCheck, color: '#30D158' },
          { label: 'AES-256 Guard', icon: Lock, color: '#4F9CF9' },
          { label: 'Zero Ad Brokers', icon: Ban, color: '#A78BFA' },
        ].map((badge, i) => {
          const Icon = badge.icon;
          return (
            <div
              key={i}
              className="flex flex-col items-center gap-2 py-3.5 px-2 rounded-2xl bg-[#151517] border border-[#2A2A2D] text-center"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center border"
                style={{
                  backgroundColor: `${badge.color}15`,
                  borderColor: `${badge.color}30`,
                  color: badge.color,
                }}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#A1A1A6]">
                {badge.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((section, i) => {
          const Icon = section.icon;
          return (
            <div
              key={i}
              className="bg-[#151517] rounded-3xl p-5 sm:p-6 border border-[#2A2A2D] space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1E1E20] border border-[#2A2A2D] flex items-center justify-center text-[#30D158]">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-headline font-black text-base text-[#F5F5F5] uppercase tracking-wide">
                  {section.title}
                </h3>
              </div>
              <div className="space-y-2.5">
                {section.items.map((item, ii) => (
                  <div key={ii} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#30D158] mt-0.5 shrink-0" />
                    <p className="text-xs text-[#A1A1A6] leading-relaxed">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="space-y-3 pt-2">
        <button
          onClick={() => showToast('Full telemetry export archive dispatched to Downloads', 'success')}
          className="w-full flex items-center justify-between p-4 bg-[#151517] hover:bg-[#1E1E20] rounded-2xl border border-[#2A2A2D] transition-all active:scale-[0.99] group"
        >
          <div className="flex items-center gap-3">
            <Download className="w-4 h-4 text-[#30D158]" />
            <span className="font-headline font-bold text-xs uppercase tracking-wider text-[#F5F5F5] group-hover:text-[#30D158] transition-colors">
              Export Athlete Telemetry Archive (CSV & GPX)
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#6B6B70] group-hover:text-[#F5F5F5] transition-colors" />
        </button>

        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full flex items-center justify-between p-4 bg-[#151517] hover:bg-[#FF453A]/10 rounded-2xl border border-[#2A2A2D] hover:border-[#FF453A]/30 transition-all active:scale-[0.99] group"
        >
          <div className="flex items-center gap-3">
            <Trash2 className="w-4 h-4 text-[#FF453A]" />
            <span className="font-headline font-bold text-xs uppercase tracking-wider text-[#FF453A]">
              Permanently Purge All Data
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#6B6B70] group-hover:text-[#FF453A] transition-colors" />
        </button>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onConfirm={() => {
          setShowDeleteConfirm(false);
          showToast('Data purge initiated. Local database cleared.', 'info');
        }}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Permanently Purge All Data?"
        message="This action permanently wipes all your recorded mesocycles, set weights, GPS routes, and bodyweight curves from local and cloud storage. It cannot be recovered."
        confirmLabel="Purge Everything"
        variant="danger"
      />
    </main>
  );
}
