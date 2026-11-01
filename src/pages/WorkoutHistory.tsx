// ─────────────────────────────────────────────────────────────
// MyFitAI — Workout History Page (/workout/history)
// Calendar + session list + detail drill-down
// Athletic Personal Operating System UI/UX
// ─────────────────────────────────────────────────────────────

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkoutBuilder } from '../context/WorkoutBuilderContext';
import HistoryCalendar from '../components/WorkoutHistory/HistoryCalendar';
import SessionCard from '../components/WorkoutHistory/SessionCard';
import SessionDetail from '../components/WorkoutHistory/SessionDetail';
import ConfirmModal from '../components/ConfirmModal';
import { ArrowLeft, Calendar, Dumbbell } from 'lucide-react';

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

  const handlePrevMonth = () =>
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const handleNextMonth = () =>
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

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
    <main className="max-w-xl mx-auto px-4 sm:px-6 pt-6 pb-28 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#2A2A2D] pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/workout')}
            className="w-10 h-10 rounded-xl bg-[#151517] border border-[#2A2A2D] flex items-center justify-center text-[#A1A1A6] hover:text-[#F5F5F5] active:scale-95 transition-all"
            aria-label="Back to Workouts"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-headline font-black text-2xl sm:text-3xl text-[#F5F5F5] tracking-tight uppercase">
                History
              </h1>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#30D158] px-2 py-0.5 rounded bg-[#30D158]/10 border border-[#30D158]/20">
                {sessions.length} SESSIONS
              </span>
            </div>
            <p className="text-xs text-[#A1A1A6] mt-0.5">
              Review completed sessions, muscle heatmap drilldowns, and PR benchmarks.
            </p>
          </div>
        </div>

        {selectedDate && (
          <button
            onClick={() => setSelectedDate(null)}
            className="text-[#30D158] text-xs font-mono font-bold uppercase tracking-wider hover:underline"
          >
            Clear Date
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
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#A1A1A6]">
              {selectedDate ? `Workouts on ${selectedDate}` : 'All Logged Sessions'}
            </h3>
            <span className="text-[11px] font-mono text-[#6B6B70]">
              {filteredSessions.length} total
            </span>
          </div>
          {filteredSessions.map(session => (
            <SessionCard
              key={session.id}
              session={session}
              onTap={setDetailId}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-[#151517] rounded-3xl border border-[#2A2A2D] p-6 space-y-3">
          <Calendar className="w-10 h-10 text-[#6B6B70] mx-auto stroke-1" />
          <div className="space-y-1">
            <p className="font-headline font-bold text-base text-[#F5F5F5]">
              {selectedDate ? 'No sessions on this day' : 'No workout history recorded yet'}
            </p>
            <p className="text-xs text-[#A1A1A6] max-w-xs mx-auto">
              {selectedDate
                ? 'Select a date marked with a green indicator to inspect that workout.'
                : 'Start and complete your first workout in the Workout Planner to review telemetry.'}
            </p>
          </div>
          {!selectedDate && (
            <button
              onClick={() => navigate('/workout')}
              className="px-5 py-2.5 rounded-xl bg-[#FF8A00] text-black font-headline font-bold text-xs uppercase tracking-wider inline-flex items-center gap-1.5 shadow-sm"
            >
              <Dumbbell className="w-4 h-4" />
              <span>Go to Workout Planner</span>
            </button>
          )}
        </div>
      )}

      {/* Detail modal */}
      {detailSession && (
        <SessionDetail
          session={detailSession}
          onClose={() => setDetailId(null)}
          onDelete={handleDelete}
        />
      )}

      <ConfirmModal
        isOpen={deleteTarget !== null}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        title="Delete Workout Session?"
        message="This session and its logged set volumes will be permanently removed from your history and heatmap."
        confirmLabel="Delete"
        variant="danger"
      />
    </main>
  );
}
