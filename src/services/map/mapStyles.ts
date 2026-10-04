// ─────────────────────────────────────────────────────────────
// MyFitAI — Map Styles & Vector Layer Definitions
// Defines GeoJSON source IDs, vector layer properties, neon-glow
// sports aesthetics, and custom DOM markers for MapLibre GL.
// ─────────────────────────────────────────────────────────────


export const MAP_SOURCES = {
  route: 'myfitai-route-source',
  territory: 'myfitai-territory-source',
  markers: 'myfitai-markers-source',
} as const;

export const MAP_LAYERS = {
  territoryFill: 'myfitai-territory-fill',
  territoryOutline: 'myfitai-territory-outline',
  routeCasing: 'myfitai-route-casing',
  routeLine: 'myfitai-route-line',
  startMarker: 'myfitai-start-marker',
  finishMarker: 'myfitai-finish-marker',
} as const;

export const THEME_COLORS = {
  neonGreen: '#6FFB85',
  neonOrange: '#FF7A00',
  defendedGold: '#FBBF24',
  casingDark: '#0A0A0C',
  casingLight: '#FFFFFF',
  pulseRing: 'rgba(111, 251, 133, 0.35)',
  accuracyFill: 'rgba(96, 165, 250, 0.15)',
  accuracyStroke: 'rgba(96, 165, 250, 0.5)',
};

/**
 * Creates custom animated athlete location DOM marker.
 */
export function createAthleteLocationMarker(heading?: number): HTMLElement {
  const container = document.createElement('div');
  container.className = 'myfitai-athlete-marker';
  container.style.width = '36px';
  container.style.height = '36px';
  container.style.display = 'flex';
  container.style.alignItems = 'center';
  container.style.justifyContent = 'center';
  container.style.position = 'relative';
  container.style.pointerEvents = 'none';

  // 1. Radar pulse ring
  const pulse = document.createElement('div');
  pulse.style.position = 'absolute';
  pulse.style.width = '32px';
  pulse.style.height = '32px';
  pulse.style.borderRadius = '50%';
  pulse.style.backgroundColor = THEME_COLORS.pulseRing;
  pulse.style.animation = 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite';
  container.appendChild(pulse);

  // 2. Heading direction cone/pointer (if available)
  if (heading !== undefined && heading !== null && !isNaN(heading)) {
    const headingCone = document.createElement('div');
    headingCone.style.position = 'absolute';
    headingCone.style.width = '0';
    headingCone.style.height = '0';
    headingCone.style.borderLeft = '6px solid transparent';
    headingCone.style.borderRight = '6px solid transparent';
    headingCone.style.borderBottom = `10px solid ${THEME_COLORS.neonGreen}`;
    headingCone.style.top = '-8px';
    headingCone.style.transformOrigin = 'bottom center';
    headingCone.style.transform = `rotate(${heading}deg)`;
    headingCone.style.filter = 'drop-shadow(0 0 4px rgba(111, 251, 133, 0.8))';
    container.appendChild(headingCone);
  }

  // 3. Central core dot
  const core = document.createElement('div');
  core.style.width = '14px';
  core.style.height = '14px';
  core.style.borderRadius = '50%';
  core.style.backgroundColor = THEME_COLORS.neonGreen;
  core.style.border = '2.5px solid #FFFFFF';
  core.style.boxShadow = '0 0 10px rgba(111, 251, 133, 0.9)';
  core.style.zIndex = '2';
  container.appendChild(core);

  return container;
}

/**
 * Creates start or finish pin marker for completed route display.
 */
export function createPinMarker(type: 'start' | 'finish'): HTMLElement {
  const pin = document.createElement('div');
  pin.className = `myfitai-pin-marker myfitai-pin-${type}`;
  pin.style.display = 'flex';
  pin.style.alignItems = 'center';
  pin.style.justifyContent = 'center';
  pin.style.width = '24px';
  pin.style.height = '24px';
  pin.style.borderRadius = '50%';
  pin.style.color = '#000000';
  pin.style.fontWeight = '800';
  pin.style.fontSize = '10px';
  pin.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.4)';
  pin.style.border = '2px solid #FFFFFF';

  if (type === 'start') {
    pin.style.backgroundColor = THEME_COLORS.neonGreen;
    pin.innerText = 'S';
  } else {
    pin.style.backgroundColor = '#EF4444';
    pin.innerText = 'F';
    pin.style.color = '#FFFFFF';
  }

  return pin;
}

/**
 * Creates moving marker for route replay.
 */
export function createReplayMarker(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'myfitai-replay-marker';
  el.style.width = '20px';
  el.style.height = '20px';
  el.style.borderRadius = '50%';
  el.style.backgroundColor = THEME_COLORS.neonOrange;
  el.style.border = '3px solid #FFFFFF';
  el.style.boxShadow = '0 0 12px rgba(255, 122, 0, 0.9)';
  return el;
}
