// ─────────────────────────────────────────────────────────────
// MyFitAI — Workout History Page (/workout/history)
// Calendar + session list + detail drill-down
// ─────────────────────────────────────────────────────────────

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkoutBuilder } from '../context/WorkoutBuilderContext';
import HistoryCalendar from '../components/WorkoutHistory/HistoryCalendar';
import SessionCard from '../components/WorkoutHistory/SessionCard';
import SessionDetail from '../components/WorkoutHistory/SessionDetail';
import ConfirmModal from '../components/ConfirmModal';

export default function WorkoutHistory() {
  const navigate = useNavigate();
  const { sessions, deleteSession } = useWorkoutBuilder();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const filteredSessions = useMemo(() => {
    if (!selectedDate) return sessions;
    return sessions.filter(s => s.startedAt.startsWith(selectedDate));
  }, [sessions, selectedDate]);

  const detailSession = detailId ? sessions.find(s => s.id === detailId) : null;

  const handlePrevMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeleteTarget(id);
  };

  const confirmDelete = async () => {
    if (deleteTarget) {
      await deleteSession(deleteTarget);
      setDetailId(null);
      setDeleteTarget(null);
    }
  };

  return (
    <main className="max-w-md mx-auto px-5 pt-6 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/workout')} className="w-9 h-9 rounded-xl bg-[var(--color-surface-container)] flex items-center justify-center text-on-surface active:scale-90 transition-transform">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          </button>
          <div>
            <h1 className="font-headline font-extrabold text-xl tracking-tight">History</h1>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-semibold">{sessions.length} sessions</p>
          </div>
        </div>
        {selectedDate && (
          <button onClick={() => setSelectedDate(null)} className="text-primary text-[11px] font-bold uppercase tracking-wider active:scale-95">
            Clear Filter
          </button>
        )}
      </div>

      {/* Calendar */}
      <HistoryCalendar
        sessions={sessions}
        currentMonth={currentMonth}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
      />

      {/* Session list */}
      {filteredSessions.length > 0 ? (
        <div className="space-y-3">
          {filteredSessions.map((session, i) => (
            <div key={session.id} className="animate-card-enter" style={{ animationDelay: `${i * 50}ms` }}>
              <SessionCard session={session} onTap={setDetailId} onDelete={handleDelete} />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant/20 mb-3 block">calendar_today</span>
          <p className="font-headline font-bold text-lg text-on-surface-variant/50 mb-1">
            {selectedDate ? 'No workouts on this day' : 'No workout history yet'}
          </p>
          <p className="text-on-surface-variant/30 text-sm">
            {selectedDate ? 'Try selecting a different date.' : 'Complete your first workout to see it here.'}
          </p>
        </div>
      )}

      {/* Detail modal */}
      {detailSession && (
        <SessionDetail session={detailSession} onClose={() => setDetailId(null)} onDelete={handleDelete} />
      )}

      <ConfirmModal
        isOpen={deleteTarget !== null}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        title="Delete Workout?"
        message="This workout session will be permanently removed from your history."
        confirmLabel="Delete"
        variant="danger"
      />
    </main>
  );
}
