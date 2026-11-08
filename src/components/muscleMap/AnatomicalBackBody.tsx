// ─────────────────────────────────────────────────────────────
// MyFitAI — Anatomical Back Body Vector SVG
// High-precision vector illustration mapping granular posterior-facing
// muscle groups with SVG paths, dynamic fills, glows, and hover effects.
// ─────────────────────────────────────────────────────────────

import type { MuscleTrainingMetric } from '../../types/anatomicalMuscle';
import type { HeatmapMode } from '../MuscleHeatmap';
import { evaluateVolumeBenchmark, evaluateRecencyBenchmark } from '../../engine/muscleRecoveryEngine';

export interface AnatomicalBackBodyProps {
  metrics: Record<string, MuscleTrainingMetric>;
  selectedMuscleId: string | null;
  onSelectMuscle: (muscleId: string) => void;
  mode: HeatmapMode;
  hoveredMuscleId: string | null;
  onHoverMuscle: (muscleId: string | null) => void;
  highlightRegion?: string | null;
  searchQuery?: string;
}

interface PathDef {
  id: string; // matches AnatomicalMuscleInfo.id
  name: string;
  side?: 'left' | 'right' | 'center';
  d: string;
}

export const BACK_MUSCLE_PATHS: PathDef[] = [
  // ── TRAPEZIUS ──
  // Upper Traps (Neck & Cervical Spine sweep)
  {
    id: 'traps_upper',
    name: 'Upper Trapezius (L)',
    side: 'left',
    d: 'M98,46 C94,48 88,54 82,60 C74,62 68,64 64,68 C72,66 84,66 92,67 C95,68 97,72 98,76 Z',
  },
  {
    id: 'traps_upper',
    name: 'Upper Trapezius (R)',
    side: 'right',
    d: 'M102,46 C106,48 112,54 118,60 C126,62 132,64 136,68 C128,66 116,66 108,67 C105,68 103,72 102,76 Z',
  },

  // Mid & Lower Traps (Trapezoid spine tapering down to mid thoracic vertebrae)
  {
    id: 'traps_lower',
    name: 'Mid & Lower Traps (L)',
    side: 'left',
    d: 'M98,78 C94,72 88,72 82,75 C80,84 84,98 90,108 C94,115 97,124 98,130 Z',
  },
  {
    id: 'traps_lower',
    name: 'Mid & Lower Traps (R)',
    side: 'right',
    d: 'M102,78 C106,72 112,72 118,75 C120,84 116,98 110,108 C106,115 103,124 102,130 Z',
  },

  // ── SHOULDERS ──
  // Posterior Deltoid (Rear Delts)
  {
    id: 'delts_posterior',
    name: 'Rear Deltoid (L)',
    side: 'left',
    d: 'M62,69 C54,72 48,80 47,89 C47,97 52,102 58,101 C61,95 62,86 64,78 Z',
  },
  {
    id: 'delts_posterior',
    name: 'Rear Deltoid (R)',
    side: 'right',
    d: 'M138,69 C146,72 152,80 153,89 C153,97 148,102 142,101 C139,95 138,86 136,78 Z',
  },

  // Lateral Deltoid (Posterior aspect)
  {
    id: 'delts_lateral',
    name: 'Lateral Deltoid (L)',
    side: 'left',
    d: 'M47,88 C44,94 44,102 46,108 C50,109 54,107 55,101 C52,95 49,91 47,88 Z',
  },
  {
    id: 'delts_lateral',
    name: 'Lateral Deltoid (R)',
    side: 'right',
    d: 'M153,88 C156,94 156,102 154,108 C150,109 146,107 145,101 C148,95 151,91 153,88 Z',
  },

  // ── UPPER/MID BACK ──
  // Rhomboids (Medial border of scapula)
  {
    id: 'rhomboids',
    name: 'Rhomboids (L)',
    side: 'left',
    d: 'M81,77 C75,81 72,90 73,101 C78,100 83,97 86,92 C83,86 82,81 81,77 Z',
  },
  {
    id: 'rhomboids',
    name: 'Rhomboids (R)',
    side: 'right',
    d: 'M119,77 C125,81 128,90 127,101 C122,100 117,97 114,92 C117,86 118,81 119,77 Z',
  },

  // Latissimus Dorsi (Lats V-Taper)
  {
    id: 'lats',
    name: 'Latissimus Dorsi (L)',
    side: 'left',
    d: 'M70,100 C64,106 62,118 64,132 C67,144 73,153 82,156 C84,146 86,134 88,122 C84,115 76,108 70,100 Z',
  },
  {
    id: 'lats',
    name: 'Latissimus Dorsi (R)',
    side: 'right',
    d: 'M130,100 C136,106 138,118 136,132 C133,144 127,153 118,156 C116,146 114,134 112,122 C116,115 124,108 130,100 Z',
  },

  // Erector Spinae (Lower Back column)
  {
    id: 'erector_spinae',
    name: 'Erector Spinae / Lower Back (L)',
    side: 'left',
    d: 'M90,131 C86,137 85,148 85,160 C90,162 95,162 98,158 L98,131 Z',
  },
  {
    id: 'erector_spinae',
    name: 'Erector Spinae / Lower Back (R)',
    side: 'right',
    d: 'M110,131 C114,137 115,148 115,160 C110,162 105,162 102,158 L102,131 Z',
  },

  // ── ARMS ──
  // Triceps Long Head (Medial posterior)
  {
    id: 'triceps_long',
    name: 'Triceps Long Head (L)',
    side: 'left',
    d: 'M56,108 C54,116 54,127 57,137 C61,137 64,133 65,123 C65,114 62,110 56,108 Z',
  },
  {
    id: 'triceps_long',
    name: 'Triceps Long Head (R)',
    side: 'right',
    d: 'M144,108 C146,116 146,127 143,137 C139,137 136,133 135,123 C135,114 138,110 144,108 Z',
  },

  // Triceps Lateral Head (Outer posterior)
  {
    id: 'triceps_lateral',
    name: 'Triceps Lateral Head (L)',
    side: 'left',
    d: 'M46,108 C44,116 44,126 47,135 C50,136 53,134 54,126 C53,117 50,111 46,108 Z',
  },
  {
    id: 'triceps_lateral',
    name: 'Triceps Lateral Head (R)',
    side: 'right',
    d: 'M154,108 C156,116 156,126 153,135 C150,136 147,134 146,126 C147,117 150,111 154,108 Z',
  },

  // Forearm Extensors (Dorsal Forearms)
  {
    id: 'forearms_extensors',
    name: 'Forearm Extensors (L)',
    side: 'left',
    d: 'M47,143 C42,153 38,168 36,185 C41,188 47,186 51,176 C55,163 55,152 47,143 Z',
  },
  {
    id: 'forearms_extensors',
    name: 'Forearm Extensors (R)',
    side: 'right',
    d: 'M153,143 C158,153 162,168 164,185 C159,188 153,186 149,176 C145,163 145,152 153,143 Z',
  },

  // ── GLUTES ──
  // Gluteus Medius (Upper outer hip)
  {
    id: 'glute_med',
    name: 'Gluteus Medius (L)',
    side: 'left',
    d: 'M74,162 C70,168 68,176 70,183 C75,183 79,178 81,171 C81,165 78,163 74,162 Z',
  },
  {
    id: 'glute_med',
    name: 'Gluteus Medius (R)',
    side: 'right',
    d: 'M126,162 C130,168 132,176 130,183 C125,183 121,178 119,171 C119,165 122,163 126,162 Z',
  },

  // Gluteus Maximus (Primary Glute mass)
  {
    id: 'glute_max',
    name: 'Gluteus Maximus (L)',
    side: 'left',
    d: 'M81,168 C73,174 72,188 74,199 C77,208 85,213 93,212 C96,206 97,192 98,176 C93,172 87,170 81,168 Z',
  },
  {
    id: 'glute_max',
    name: 'Gluteus Maximus (R)',
    side: 'right',
    d: 'M119,168 C127,174 128,188 126,199 C123,208 115,213 107,212 C104,206 103,192 102,176 C107,172 113,170 119,168 Z',
  },

  // ── HAMSTRINGS ──
  // Biceps Femoris (Lateral Hamstring)
  {
    id: 'hamstrings_lateral',
    name: 'Biceps Femoris / Outer Hamstring (L)',
    side: 'left',
    d: 'M73,216 C69,228 68,242 72,252 C76,252 79,248 81,238 C82,228 82,220 78,216 Z',
  },
  {
    id: 'hamstrings_lateral',
    name: 'Biceps Femoris / Outer Hamstring (R)',
    side: 'right',
    d: 'M127,216 C131,228 132,242 128,252 C124,252 121,248 119,238 C118,228 118,220 122,216 Z',
  },

  // Semitendinosus / Semimembranosus (Medial Hamstring)
  {
    id: 'hamstrings_medial',
    name: 'Semitendinosus / Inner Hamstring (L)',
    side: 'left',
    d: 'M84,216 C84,228 84,242 85,252 C89,252 93,248 94,238 C94,228 92,220 89,216 Z',
  },
  {
    id: 'hamstrings_medial',
    name: 'Semitendinosus / Inner Hamstring (R)',
    side: 'right',
    d: 'M116,216 C116,228 116,242 115,252 C111,252 107,248 106,238 C106,228 108,220 111,216 Z',
  },

  // ── CALVES ──
  // Calves - Gastrocnemius (Diamond bellies)
  {
    id: 'calves_gastrocnemius',
    name: 'Gastrocnemius Back (L)',
    side: 'left',
    d: 'M71,258 C66,268 67,282 72,296 C76,298 86,298 90,290 C92,280 91,268 87,258 C82,260 76,260 71,258 Z',
  },
  {
    id: 'calves_gastrocnemius',
    name: 'Gastrocnemius Back (R)',
    side: 'right',
    d: 'M129,258 C134,268 133,282 128,296 C124,298 114,298 110,290 C108,280 109,268 113,258 C118,260 124,260 129,258 Z',
  },

  // Calves - Soleus (Lower calf flanking Achilles)
  {
    id: 'calves_soleus',
    name: 'Soleus (L)',
    side: 'left',
    d: 'M73,298 C72,306 74,316 77,322 C81,324 85,322 86,316 C85,308 83,302 80,298 Z',
  },
  {
    id: 'calves_soleus',
    name: 'Soleus (R)',
    side: 'right',
    d: 'M127,298 C128,306 126,316 123,322 C119,324 115,322 114,316 C115,308 117,302 120,298 Z',
  },
];

export default function AnatomicalBackBody({
  metrics,
  selectedMuscleId,
  onSelectMuscle,
  mode,
  hoveredMuscleId,
  onHoverMuscle,
  highlightRegion,
  searchQuery,
}: AnatomicalBackBodyProps) {
  const getStyleForMuscle = (muscleId: string) => {
    const isSelected = selectedMuscleId === muscleId;
    const isHovered = hoveredMuscleId === muscleId;
    const metric = metrics[muscleId];

    // Check region highlight & search query filters
    const matchesRegion = !highlightRegion || highlightRegion === 'all' || metric?.info?.region === highlightRegion;
    const matchesSearch = !searchQuery || searchQuery.trim() === '' || 
      (metric?.info?.commonName.toLowerCase().includes(searchQuery.toLowerCase()) || 
       metric?.info?.canonicalGroup.toLowerCase().includes(searchQuery.toLowerCase()));

    // Stroke definition
    const stroke = isSelected
      ? '#FFFFFF'
      : isHovered
      ? '#38BDF8'
      : matchesSearch && searchQuery
      ? '#F5C542'
      : 'rgba(255, 255, 255, 0.12)';
    const strokeWidth = isSelected ? '2' : isHovered ? '1.5' : matchesSearch && searchQuery ? '1.5' : '0.6';
    const filter = isSelected
      ? 'url(#glow-back-selected)'
      : isHovered
      ? 'url(#glow-back-hover)'
      : matchesSearch && searchQuery
      ? 'url(#glow-back-primary)'
      : undefined;

    // Dim non-matching region
    const baseOpacity = matchesRegion ? 1 : 0.2;

    // 1. RECOVERY STATUS MODE
    if (mode === 'fatigue') {
      if (!metric || (metric.recoveryPercentage === 100 && metric.hoursSinceLastTrained === null)) {
        return { fill: 'rgba(255, 255, 255, 0.05)', stroke, strokeWidth, filter, opacity: baseOpacity };
      }
      const rec = metric.recoveryPercentage;
      if (rec >= 90) return { fill: '#10B981', fillOpacity: 0.88, stroke, strokeWidth, filter, opacity: baseOpacity }; // Fresh
      if (rec >= 55) return { fill: '#F59E0B', fillOpacity: 0.9, stroke, strokeWidth, filter, opacity: baseOpacity };  // Recovering
      return { fill: '#EF4444', fillOpacity: 0.95, stroke, strokeWidth, filter, opacity: baseOpacity };               // Fatigued
    }

    // 2. VOLUME MODE (Per-Muscle Scientific Landmark Resolution)
    if (mode === 'volume') {
      if (!metric || metric.effectiveSets === 0) {
        return { fill: 'rgba(255, 255, 255, 0.04)', stroke, strokeWidth, filter, opacity: baseOpacity };
      }
      const benchmark = evaluateVolumeBenchmark(
        metric.effectiveSets,
        metric.info.minEffectiveVolume,
        metric.info.maxAdaptiveVolume,
        metric.info.maxRecoverableVolume
      );
      return {
        fill: benchmark.color,
        fillOpacity: isSelected || isHovered ? 1 : 0.88,
        stroke,
        strokeWidth,
        filter,
        opacity: baseOpacity,
      };
    }

    // 3. RECENCY / FREQUENCY DECAY MODE
    if (mode === 'recency') {
      if (!metric || metric.hoursSinceLastTrained === null) {
        return { fill: 'rgba(255, 255, 255, 0.04)', stroke, strokeWidth, filter, opacity: baseOpacity };
      }
      const recency = evaluateRecencyBenchmark(metric.hoursSinceLastTrained);
      return {
        fill: recency.color,
        fillOpacity: isSelected || isHovered ? 1 : recency.fillOpacity,
        stroke,
        strokeWidth,
        filter,
        opacity: baseOpacity,
      };
    }

    // 4. TARGET / LOAD MODE (Default)
    if (!metric || (!metric.targetRole && metric.effectiveSets === 0)) {
      return { fill: 'rgba(255, 255, 255, 0.05)', stroke, strokeWidth, filter, opacity: baseOpacity };
    }

    if (metric.targetRole === 'primary') {
      return {
        fill: '#FF7A00',
        fillOpacity: 0.95,
        stroke,
        strokeWidth: isSelected ? '2.5' : '1.2',
        filter: isSelected ? 'url(#glow-back-selected)' : 'url(#glow-back-primary)',
        opacity: baseOpacity,
      };
    }

    // Synergist role
    return {
      fill: '#0284C7',
      fillOpacity: 0.85,
      stroke,
      strokeWidth: isSelected ? '2' : '1',
      filter: isSelected ? 'url(#glow-back-selected)' : undefined,
      opacity: baseOpacity,
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
          <filter id="glow-back-primary" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glow-back-selected" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#FFFFFF" floodOpacity="0.8" />
          </filter>
          <filter id="glow-back-hover" x="-25%" y="-25%" width="150%" height="150%">
            <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#38BDF8" floodOpacity="0.7" />
          </filter>
        </defs>

        {/* ── Neutral Anatomical Base Frame ── */}
        <g opacity="0.25">
          {/* Head & Cranium (Posterior View) */}
          <path
            d="M100,10 C108,10 114,16 114,26 C114,35 108,42 100,42 C92,42 86,35 86,26 C86,16 92,10 100,10 Z"
            fill="rgba(255, 255, 255, 0.08)"
            stroke="rgba(255, 255, 255, 0.15)"
            strokeWidth="0.8"
          />
          {/* Cervical spine centerline */}
          <line x1="100" y1="42" x2="100" y2="160" stroke="rgba(255, 255, 255, 0.25)" strokeWidth="0.8" strokeDasharray="3,3" />
          {/* Hands */}
          <ellipse cx="34" cy="200" rx="4.5" ry="8" fill="rgba(255, 255, 255, 0.06)" />
          <ellipse cx="166" cy="200" rx="4.5" ry="8" fill="rgba(255, 255, 255, 0.06)" />
          {/* Feet & Achilles */}
          <ellipse cx="80" cy="336" rx="6" ry="12" fill="rgba(255, 255, 255, 0.06)" />
          <ellipse cx="120" cy="336" rx="6" ry="12" fill="rgba(255, 255, 255, 0.06)" />
        </g>

        {/* ── Interactive Muscle Path Layers ── */}
        <g>
          {BACK_MUSCLE_PATHS.map((path, idx) => {
            const style = getStyleForMuscle(path.id);
            return (
              <path
                key={`back-${path.id}-${idx}`}
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
        Posterior (Back)
      </span>
    </div>
  );
}
