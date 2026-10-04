// ─────────────────────────────────────────────────────────────
// MyFitAI — Anatomical Front Body Vector SVG
// High-precision vector illustration mapping granular front-facing
// muscle groups with SVG paths, dynamic fills, glows, and hover effects.
// ─────────────────────────────────────────────────────────────

import type { MuscleTrainingMetric } from '../../types/anatomicalMuscle';
import type { HeatmapMode } from '../MuscleHeatmap';

export interface AnatomicalBodyProps {
  metrics: Record<string, MuscleTrainingMetric>;
  selectedMuscleId: string | null;
  onSelectMuscle: (muscleId: string) => void;
  mode: HeatmapMode;
  hoveredMuscleId: string | null;
  onHoverMuscle: (muscleId: string | null) => void;
}

interface PathDef {
  id: string; // matches AnatomicalMuscleInfo.id
  name: string;
  side?: 'left' | 'right' | 'center';
  d: string;
}

export const FRONT_MUSCLE_PATHS: PathDef[] = [
  // ── CHEST ──
  // Upper Chest (Clavicular Head)
  { id: 'chest_upper', name: 'Upper Chest (L)', side: 'left', d: 'M98,62 C88,62 76,64 68,72 C66,77 68,83 75,85 C83,87 91,85 98,75 Z' },
  { id: 'chest_upper', name: 'Upper Chest (R)', side: 'right', d: 'M102,62 C112,62 124,64 132,72 C134,77 132,83 125,85 C117,87 109,85 102,75 Z' },

  // Mid Chest (Sternal Head)
  { id: 'chest_mid', name: 'Mid Chest (L)', side: 'left', d: 'M98,77 C90,86 80,88 73,86 C69,94 72,102 79,105 C88,107 96,104 98,96 Z' },
  { id: 'chest_mid', name: 'Mid Chest (R)', side: 'right', d: 'M102,77 C110,86 120,88 127,86 C131,94 128,102 121,105 C112,107 104,104 102,96 Z' },

  // Lower Chest (Costal Head)
  { id: 'chest_lower', name: 'Lower Chest (L)', side: 'left', d: 'M98,97 C95,104 88,107 80,105 C75,108 78,114 85,114 C92,114 97,110 98,105 Z' },
  { id: 'chest_lower', name: 'Lower Chest (R)', side: 'right', d: 'M102,97 C105,104 112,107 120,105 C125,108 122,114 115,114 C108,114 103,110 102,105 Z' },

  // ── SHOULDERS ──
  // Anterior Deltoid
  { id: 'delts_anterior', name: 'Front Deltoid (L)', side: 'left', d: 'M66,62 C58,65 52,73 50,83 C48,93 52,99 58,98 C61,91 63,82 66,74 Z' },
  { id: 'delts_anterior', name: 'Front Deltoid (R)', side: 'right', d: 'M134,62 C142,65 148,73 150,83 C152,93 148,99 142,98 C139,91 137,82 134,74 Z' },

  // Lateral Deltoid
  { id: 'delts_lateral', name: 'Lateral Deltoid (L)', side: 'left', d: 'M50,83 C46,90 45,99 48,107 C51,108 55,106 57,99 C55,93 53,88 50,83 Z' },
  { id: 'delts_lateral', name: 'Lateral Deltoid (R)', side: 'right', d: 'M150,83 C154,90 155,99 152,107 C149,108 145,106 143,99 C145,93 147,88 150,83 Z' },

  // ── ARMS ──
  // Biceps (Long & Short Head)
  { id: 'biceps_long', name: 'Biceps Long Head (L)', side: 'left', d: 'M48,108 C45,116 46,128 49,136 C53,137 57,135 58,126 C57,117 54,111 48,108 Z' },
  { id: 'biceps_long', name: 'Biceps Long Head (R)', side: 'right', d: 'M152,108 C155,116 154,128 151,136 C147,137 143,135 142,126 C143,117 146,111 152,108 Z' },

  { id: 'biceps_short', name: 'Biceps Short Head (L)', side: 'left', d: 'M58,110 C57,118 57,128 61,136 C64,136 67,132 67,122 C67,114 63,111 58,110 Z' },
  { id: 'biceps_short', name: 'Biceps Short Head (R)', side: 'right', d: 'M142,110 C143,118 143,128 139,136 C136,136 133,132 133,122 C133,114 137,111 142,110 Z' },

  // Brachialis
  { id: 'brachialis', name: 'Brachialis (L)', side: 'left', d: 'M45,124 C44,130 45,137 47,142 C49,142 51,140 50,135 C48,131 47,127 45,124 Z' },
  { id: 'brachialis', name: 'Brachialis (R)', side: 'right', d: 'M155,124 C156,130 155,137 153,142 C151,142 149,140 150,135 C152,131 153,127 155,124 Z' },

  // Forearm Flexors
  { id: 'forearms_flexors', name: 'Forearm Flexors (L)', side: 'left', d: 'M48,143 C43,153 39,168 37,185 C42,188 48,186 52,176 C56,163 56,152 48,143 Z' },
  { id: 'forearms_flexors', name: 'Forearm Flexors (R)', side: 'right', d: 'M152,143 C157,153 161,168 163,185 C158,188 152,186 148,176 C144,163 144,152 152,143 Z' },

  // Forearm Extensors (Visible lateral edge)
  { id: 'forearms_extensors', name: 'Forearm Extensors (L)', side: 'left', d: 'M36,160 C34,170 34,180 36,188 C38,188 39,183 39,174 C39,168 38,164 36,160 Z' },
  { id: 'forearms_extensors', name: 'Forearm Extensors (R)', side: 'right', d: 'M164,160 C166,170 166,180 164,188 C162,188 161,183 161,174 C161,168 162,164 164,160 Z' },

  // ── CORE ──
  // Upper Abs
  { id: 'abs_upper', name: 'Upper Abs (L)', side: 'left', d: 'M87,118 L98,118 L98,131 L87,131 Z' },
  { id: 'abs_upper', name: 'Upper Abs (R)', side: 'right', d: 'M102,118 L113,118 L113,131 L102,131 Z' },

  // Mid / Lower Abs
  { id: 'abs_lower', name: 'Lower Abs (L)', side: 'left', d: 'M88,134 L98,134 L98,154 L90,154 Z' },
  { id: 'abs_lower', name: 'Lower Abs (R)', side: 'right', d: 'M102,134 L112,134 L110,154 L102,154 Z' },

  // Obliques
  { id: 'obliques', name: 'External Obliques (L)', side: 'left', d: 'M74,116 C70,128 70,144 74,158 C79,160 85,158 86,148 C83,136 82,126 74,116 Z' },
  { id: 'obliques', name: 'External Obliques (R)', side: 'right', d: 'M126,116 C130,128 130,144 126,158 C121,160 115,158 114,148 C117,136 118,126 126,116 Z' },

  // ── LEGS ──
  // Adductors (Inner Thigh)
  { id: 'adductors', name: 'Adductors (L)', side: 'left', d: 'M92,175 C94,188 95,204 96,218 C94,222 91,222 89,214 C87,200 87,186 92,175 Z' },
  { id: 'adductors', name: 'Adductors (R)', side: 'right', d: 'M108,175 C106,188 105,204 104,218 C106,222 109,222 111,214 C113,200 113,186 108,175 Z' },

  // Quadriceps - Rectus Femoris (Central Quad)
  { id: 'quads_rectus_femoris', name: 'Rectus Femoris (L)', side: 'left', d: 'M80,172 C77,185 76,204 77,222 C81,228 88,228 89,220 C89,202 88,184 80,172 Z' },
  { id: 'quads_rectus_femoris', name: 'Rectus Femoris (R)', side: 'right', d: 'M120,172 C123,185 124,204 123,222 C119,228 112,228 111,220 C111,202 112,184 120,172 Z' },

  // Quadriceps - Vastus Lateralis & Medialis (Outer & Teardrop)
  { id: 'quads_vastus', name: 'Vastus Lateralis (L)', side: 'left', d: 'M78,172 C71,185 68,206 71,228 C74,233 77,232 77,224 C75,206 76,188 78,172 Z' },
  { id: 'quads_vastus', name: 'Vastus Lateralis (R)', side: 'right', d: 'M122,172 C129,185 132,206 129,228 C126,233 123,232 123,224 C125,206 124,188 122,172 Z' },

  // Calves - Gastrocnemius (Medial & Lateral sweep front)
  { id: 'calves_gastrocnemius', name: 'Gastrocnemius Front (L)', side: 'left', d: 'M69,252 C67,264 68,278 72,292 C74,292 76,288 75,276 C74,266 73,258 69,252 Z' },
  { id: 'calves_gastrocnemius', name: 'Gastrocnemius Front (R)', side: 'right', d: 'M131,252 C133,264 132,278 128,292 C126,292 124,288 125,276 C126,266 127,258 131,252 Z' },

  // Tibialis Anterior (Shin)
  { id: 'tibialis', name: 'Tibialis Anterior (L)', side: 'left', d: 'M76,252 C76,268 77,288 80,314 C84,316 88,314 88,306 C86,288 84,268 81,252 Z' },
  { id: 'tibialis', name: 'Tibialis Anterior (R)', side: 'right', d: 'M124,252 C124,268 123,288 120,314 C116,316 112,314 112,306 C114,288 116,268 119,252 Z' },
];

export default function AnatomicalFrontBody({
  metrics,
  selectedMuscleId,
  onSelectMuscle,
  mode,
  hoveredMuscleId,
  onHoverMuscle,
}: AnatomicalBodyProps) {
  const getStyleForMuscle = (muscleId: string) => {
    const isSelected = selectedMuscleId === muscleId;
    const isHovered = hoveredMuscleId === muscleId;
    const metric = metrics[muscleId];

    // Stroke definition
    const stroke = isSelected
      ? '#FFFFFF'
      : isHovered
      ? '#38BDF8'
      : 'rgba(255, 255, 255, 0.12)';
    const strokeWidth = isSelected ? '2' : isHovered ? '1.5' : '0.6';
    const filter = isSelected
      ? 'url(#glow-front-selected)'
      : isHovered
      ? 'url(#glow-front-hover)'
      : undefined;

    // 1. RECOVERY STATUS MODE
    if (mode === 'fatigue') {
      if (!metric || metric.recoveryPercentage === 100 && metric.hoursSinceLastTrained === null) {
        return { fill: 'rgba(255, 255, 255, 0.05)', stroke, strokeWidth, filter };
      }
      const rec = metric.recoveryPercentage;
      if (rec >= 90) return { fill: '#10B981', fillOpacity: 0.88, stroke, strokeWidth, filter }; // Fresh
      if (rec >= 55) return { fill: '#F59E0B', fillOpacity: 0.9, stroke, strokeWidth, filter };  // Recovering
      return { fill: '#EF4444', fillOpacity: 0.95, stroke, strokeWidth, filter };               // Fatigued
    }

    // 2. VOLUME MODE
    if (mode === 'volume') {
      const sets = metric?.effectiveSets || 0;
      if (sets === 0) return { fill: 'rgba(255, 255, 255, 0.04)', stroke, strokeWidth, filter };
      if (sets < 6) return { fill: '#38BDF8', fillOpacity: 0.8, stroke, strokeWidth, filter };   // Under MEV
      if (sets <= 14) return { fill: '#10B981', fillOpacity: 0.88, stroke, strokeWidth, filter }; // Optimal MAV
      if (sets <= 20) return { fill: '#F59E0B', fillOpacity: 0.92, stroke, strokeWidth, filter }; // High volume
      return { fill: '#EF4444', fillOpacity: 0.98, stroke, strokeWidth, filter };                // Overreached
    }

    // 3. TARGET / LOAD MODE (Default)
    if (!metric || (!metric.targetRole && metric.effectiveSets === 0)) {
      return { fill: 'rgba(255, 255, 255, 0.05)', stroke, strokeWidth, filter };
    }

    if (metric.targetRole === 'primary') {
      return {
        fill: '#FF7A00',
        fillOpacity: 0.95,
        stroke,
        strokeWidth: isSelected ? '2.5' : '1.2',
        filter: isSelected ? 'url(#glow-front-selected)' : 'url(#glow-front-primary)',
      };
    }

    // Synergist role
    return {
      fill: '#0284C7',
      fillOpacity: 0.85,
      stroke,
      strokeWidth: isSelected ? '2' : '1',
      filter: isSelected ? 'url(#glow-front-selected)' : undefined,
    };
  };

  return (
    <div className="relative flex flex-col items-center">
      <svg
        viewBox="0 0 200 360"
        className="w-full h-auto max-h-[380px] drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)] select-none"
        style={{ touchAction: 'manipulation' }}
      >
        <defs>
          {/* Subtle Glows */}
          <filter id="glow-front-primary" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glow-front-selected" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#FFFFFF" floodOpacity="0.8" />
          </filter>
          <filter id="glow-front-hover" x="-25%" y="-25%" width="150%" height="150%">
            <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#38BDF8" floodOpacity="0.7" />
          </filter>
        </defs>

        {/* ── Neutral Anatomical Base Frame ── */}
        <g opacity="0.25">
          {/* Head & Cranium */}
          <path
            d="M100,10 C108,10 114,16 114,26 C114,35 108,42 100,42 C92,42 86,35 86,26 C86,16 92,10 100,10 Z"
            fill="rgba(255, 255, 255, 0.08)"
            stroke="rgba(255, 255, 255, 0.15)"
            strokeWidth="0.8"
          />
          {/* Neck & Cervical base */}
          <path d="M94,42 L106,42 L110,56 L90,56 Z" fill="rgba(255, 255, 255, 0.06)" />
          {/* Clavicle Landmark */}
          <line x1="68" y1="58" x2="132" y2="58" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="0.8" strokeDasharray="2,2" />
          {/* Hands */}
          <ellipse cx="34" cy="200" rx="4.5" ry="8" fill="rgba(255, 255, 255, 0.06)" />
          <ellipse cx="166" cy="200" rx="4.5" ry="8" fill="rgba(255, 255, 255, 0.06)" />
          {/* Feet & Ankles */}
          <ellipse cx="80" cy="336" rx="6" ry="12" fill="rgba(255, 255, 255, 0.06)" />
          <ellipse cx="120" cy="336" rx="6" ry="12" fill="rgba(255, 255, 255, 0.06)" />
        </g>

        {/* ── Interactive Muscle Path Layers ── */}
        <g>
          {FRONT_MUSCLE_PATHS.map((path, idx) => {
            const style = getStyleForMuscle(path.id);
            return (
              <path
                key={`front-${path.id}-${idx}`}
                d={path.d}
                fill={style.fill}
                fillOpacity={style.fillOpacity}
                stroke={style.stroke}
                strokeWidth={style.strokeWidth}
                filter={style.filter}
                className="transition-all duration-200 cursor-pointer hover:brightness-125"
                onClick={() => onSelectMuscle(path.id)}
                onMouseEnter={() => onHoverMuscle(path.id)}
                onMouseLeave={() => onHoverMuscle(null)}
              >
                <title>{`${path.name} — Click to inspect`}</title>
              </path>
            );
          })}
        </g>
      </svg>
      <span className="text-[10px] font-mono tracking-widest text-on-surface-variant/60 uppercase mt-1 font-semibold">
        Anterior (Front)
      </span>
    </div>
  );
}
