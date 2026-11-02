// ─────────────────────────────────────────────────────────────
// MyFitAI — Custom Exercise Creator
// Full form for users to add their own exercises to the library.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../utils/db';
import { ArrowLeft } from 'lucide-react';
import type { Exercise, MuscleGroup, EquipmentType, ExerciseType, BodyPart, ExerciseDifficulty, ExerciseCategory, MovementPattern } from '../types/exercise';
import {
  ALL_BODY_PARTS, ALL_EQUIPMENT, ALL_EXERCISE_TYPES, ALL_MUSCLE_GROUPS,
  BODY_PART_LABELS, EQUIPMENT_LABELS, EXERCISE_TYPE_LABELS, MUSCLE_GROUP_LABELS,
} from '../types/exercise';

export default function CustomExerciseCreator() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [bodyPart, setBodyPart] = useState<BodyPart>('chest');
  const [equipment, setEquipment] = useState<EquipmentType>('barbell');
  const [exerciseType, setExerciseType] = useState<ExerciseType>('weight_reps');
  const [difficulty, setDifficulty] = useState<ExerciseDifficulty>('intermediate');
  const [primaryMuscles, setPrimaryMuscles] = useState<MuscleGroup[]>([]);
  const [secondaryMuscles, setSecondaryMuscles] = useState<MuscleGroup[]>([]);
  const [isUnilateral, setIsUnilateral] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [tips, setTips] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [gifUrl, setGifUrl] = useState('');

  const toggleMuscle = (muscle: MuscleGroup, isPrimary: boolean) => {
    if (isPrimary) {
      setPrimaryMuscles(prev =>
        prev.includes(muscle) ? prev.filter(m => m !== muscle) : [...prev, muscle]
      );
    } else {
      setSecondaryMuscles(prev =>
        prev.includes(muscle) ? prev.filter(m => m !== muscle) : [...prev, muscle]
      );
    }
  };

  const resolveVideoId = (url: string): string => {
    if (!url) return '';
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=))([\w-]{8,15})/);
    return match ? match[1] : url;
  };

  const handleSave = async () => {
    if (!name.trim() || primaryMuscles.length === 0) return;
    setSaving(true);

    const videoId = resolveVideoId(videoUrl);
    const exercise: Exercise = {
      id: `custom_${crypto.randomUUID()}`,
      name: name.trim(),
      primaryMuscles,
      secondaryMuscles,
      bodyPart,
      equipment,
      category: 'compound' as ExerciseCategory,
      exerciseType,
      movementPattern: 'isolation' as MovementPattern,
      difficulty,
      instructions: instructions.split('\n').filter(l => l.trim()),
      tips: [tips],
      thumbnailEmoji: '🏋️',
      isCustom: true,
      isUnilateral,
      gifUrl: gifUrl.trim() || undefined,
      videoUrl: videoId,
      imageUrl: gifUrl.trim() || (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : undefined),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: user?.uid,
    };

    try {
      await db.exercises.save(exercise);
      navigate('/exercises');
    } catch (e) {
      console.error('Failed to save exercise:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="max-w-md mx-auto px-5 pt-6 pb-32">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-xl bg-[#151517] border border-[#2A2A2D] flex items-center justify-center text-[#A1A1A6] hover:text-[#F5F5F5] active:scale-95 transition-all"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-headline font-black text-xl text-[#F5F5F5] uppercase tracking-tight">Create Custom Exercise</h1>
      </div>

      <div className="space-y-5">
        {/* Name */}
        <div>
          <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant block mb-2">Exercise Name *</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Landmine Row"
            className="w-full bg-[var(--color-surface-container)] border border-white/[0.04] rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:border-primary/40"
          />
        </div>

        {/* Body Part */}
        <div>
          <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant block mb-2">Body Part</label>
          <div className="flex flex-wrap gap-1.5">
            {ALL_BODY_PARTS.map(bp => (
              <button
                key={bp}
                onClick={() => setBodyPart(bp)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all active:scale-95 ${
                  bodyPart === bp ? 'bg-primary text-on-primary' : 'bg-white/[0.04] text-on-surface'
                }`}
              >
                {BODY_PART_LABELS[bp]}
              </button>
            ))}
          </div>
        </div>

        {/* Equipment */}
        <div>
          <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant block mb-2">Equipment</label>
          <div className="flex flex-wrap gap-1.5">
            {ALL_EQUIPMENT.map(eq => (
              <button
                key={eq}
                onClick={() => setEquipment(eq)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all active:scale-95 ${
                  equipment === eq ? 'bg-primary text-on-primary' : 'bg-white/[0.04] text-on-surface'
                }`}
              >
                {EQUIPMENT_LABELS[eq]}
              </button>
            ))}
          </div>
        </div>

        {/* Exercise Type */}
        <div>
          <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant block mb-2">Measurement Type</label>
          <div className="flex flex-wrap gap-1.5">
            {ALL_EXERCISE_TYPES.map(t => (
              <button
                key={t}
                onClick={() => setExerciseType(t)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all active:scale-95 ${
                  exerciseType === t ? 'bg-primary text-on-primary' : 'bg-white/[0.04] text-on-surface'
                }`}
              >
                {EXERCISE_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div>
          <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant block mb-2">Difficulty</label>
          <div className="flex gap-2">
            {(['beginner', 'intermediate', 'advanced'] as ExerciseDifficulty[]).map(d => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`flex-1 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95 ${
                  difficulty === d ? 'bg-primary text-on-primary' : 'bg-white/[0.04] text-on-surface'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Primary Muscles */}
        <div>
          <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant block mb-2">Primary Muscles *</label>
          <div className="flex flex-wrap gap-1.5">
            {ALL_MUSCLE_GROUPS.filter(m => m !== 'full_body').map(m => (
              <button
                key={m}
                onClick={() => toggleMuscle(m, true)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all active:scale-95 ${
                  primaryMuscles.includes(m) ? 'bg-primary text-on-primary' : 'bg-white/[0.04] text-on-surface'
                }`}
              >
                {MUSCLE_GROUP_LABELS[m]}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary Muscles */}
        <div>
          <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant block mb-2">Secondary Muscles</label>
          <div className="flex flex-wrap gap-1.5">
            {ALL_MUSCLE_GROUPS.filter(m => m !== 'full_body' && !primaryMuscles.includes(m)).map(m => (
              <button
                key={m}
                onClick={() => toggleMuscle(m, false)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all active:scale-95 ${
                  secondaryMuscles.includes(m) ? 'bg-secondary text-on-secondary' : 'bg-white/[0.04] text-on-surface'
                }`}
              >
                {MUSCLE_GROUP_LABELS[m]}
              </button>
            ))}
          </div>
        </div>

        {/* Unilateral toggle */}
        <div className="flex items-center justify-between bg-[var(--color-surface-container)] rounded-xl px-4 py-3 border border-white/[0.04]">
          <div>
            <p className="text-sm font-bold text-on-surface">Unilateral Exercise</p>
            <p className="text-[10px] text-on-surface-variant">Track each side separately</p>
          </div>
          <button
            onClick={() => setIsUnilateral(!isUnilateral)}
            className={`w-12 h-7 rounded-full transition-all relative ${isUnilateral ? 'bg-primary' : 'bg-white/10'}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white absolute top-1 transition-transform ${isUnilateral ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {/* Instructions */}
        <div>
          <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant block mb-2">Instructions (one step per line)</label>
          <textarea
            value={instructions}
            onChange={e => setInstructions(e.target.value)}
            placeholder="Step 1&#10;Step 2&#10;Step 3"
            rows={4}
            className="w-full bg-[var(--color-surface-container)] border border-white/[0.04] rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:border-primary/40 resize-none"
          />
        </div>

        {/* Tips */}
        <div>
          <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant block mb-2">Pro Tips</label>
          <input
            value={tips}
            onChange={e => setTips(e.target.value)}
            placeholder="Form cues, common mistakes..."
            className="w-full bg-[var(--color-surface-container)] border border-white/[0.04] rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:border-primary/40"
          />
        </div>

        {/* Animated GIF / Image URL */}
        <div>
          <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant block mb-2">Animated GIF / Image URL (optional)</label>
          <input
            value={gifUrl}
            onChange={e => setGifUrl(e.target.value)}
            placeholder="https://.../exercise.gif or .jpg"
            className="w-full bg-[var(--color-surface-container)] border border-white/[0.04] rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:border-primary/40"
          />
        </div>

        {/* Video URL */}
        <div>
          <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant block mb-2">Video Tutorial URL (optional)</label>
          <input
            value={videoUrl}
            onChange={e => setVideoUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className="w-full bg-[var(--color-surface-container)] border border-white/[0.04] rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:border-primary/40"
          />
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={!name.trim() || primaryMuscles.length === 0 || saving}
          className="w-full py-4 rounded-2xl bg-primary text-on-primary font-bold text-sm uppercase tracking-widest active:scale-95 transition-transform disabled:opacity-40 disabled:active:scale-100"
        >
          {saving ? 'Saving...' : 'Save Exercise'}
        </button>
      </div>
    </main>
  );
}
