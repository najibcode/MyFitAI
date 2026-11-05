// ─────────────────────────────────────────────────────────────
// MyFitAI — Notifications & Telemetry Alerts Panel
// Athletic Personal Operating System UI/UX
// ─────────────────────────────────────────────────────────────

import { useToast } from '../context/ToastContext';
import {
  Droplets,
  CheckCircle2,
  Dumbbell,
  AlertTriangle,
  Bell,
} from 'lucide-react';

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationsPanel({ isOpen, onClose }: NotificationsPanelProps) {
  const { showToast } = useToast();
  if (!isOpen) return null;

  const notifications = [
    {
      title: 'Hydration Target Pacing',
      desc: 'You are 500 ml behind your daily athletic hydration benchmark.',
      time: '10m ago',
      icon: Droplets,
      color: '#4F9CF9',
    },
    {
      title: 'Daily Step Milestone',
      desc: 'You exceeded 10,000 steps today. Recovery efficiency +12%.',
      time: '1h ago',
      icon: CheckCircle2,
      color: '#30D158',
    },
    {
      title: 'Scheduled Hypertrophy Block',
      desc: 'Chest & Delts progressive overload session starts in 30 mins.',
      time: '2h ago',
      icon: Dumbbell,
      color: '#FF8A00',
    },
    {
      title: 'Prolonged Inactivity Warning',
      desc: 'Sedentary state detected for 120 mins. Stand up and do mobility work.',
      time: '5h ago',
      icon: AlertTriangle,
      color: '#FF453A',
    },
  ];

  return (
    <>
      <div className="fixed inset-0 z-[150]" onClick={onClose} />
      <div className="absolute top-16 right-4 sm:right-8 w-84 sm:w-96 bg-[#151517] border border-[#2A2A2D] rounded-3xl p-5 z-[200] shadow-2xl animate-in fade-in slide-in-from-top-3 duration-200">
        <div className="flex items-center justify-between mb-4 border-b border-[#2A2A2D] pb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#30D158]" />
            <h3 className="font-headline font-black text-sm uppercase tracking-wide text-[#F5F5F5]">
              System Telemetry Alerts
            </h3>
          </div>
          <button
            onClick={() => {
              showToast('All notifications marked as read', 'success');
              onClose();
            }}
            className="text-[10px] font-mono font-bold text-[#30D158] uppercase tracking-wider hover:underline"
          >
            Mark All Read
          </button>
        </div>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto [scrollbar-width:none]">
          {notifications.map((notif, idx) => {
            const Icon = notif.icon;
            return (
              <div
                key={idx}
                className="flex items-start gap-3.5 p-3 rounded-2xl bg-[#1E1E20] border border-[#2A2A2D] hover:border-[#3A3A3D] transition-colors cursor-pointer group"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border mt-0.5"
                  style={{
                    backgroundColor: `${notif.color}15`,
                    borderColor: `${notif.color}33`,
                    color: notif.color,
                  }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="font-headline font-bold text-xs text-[#F5F5F5] group-hover:text-[#30D158] transition-colors truncate">
                      {notif.title}
                    </p>
                    <span className="text-[9px] font-mono text-[#6B6B70] shrink-0">
                      {notif.time}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#A1A1A6] leading-relaxed mt-0.5">
                    {notif.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
