// ─────────────────────────────────────────────────────────────
// MyFitAI — MapView Component (Seamless WorkoutMap Wrapper)
// Provides complete backward compatibility for components expecting
// <MapView /> while routing directly into the production MapLibre
// and OpenFreeMap vector engine.
// ─────────────────────────────────────────────────────────────

import WorkoutMap, { type WorkoutMapProps } from './WorkoutMap';
import type { ActivityPoint, TerritoryCell, GPSQuality } from '../../types/activity';

export interface MapViewProps extends Partial<WorkoutMapProps> {
  currentLocation?: ActivityPoint | null;
  routePoints?: ActivityPoint[];
  territoryCells?: TerritoryCell[];
  interactive?: boolean;
  followUser?: boolean;
  height?: string | number;
  className?: string;
  providerId?: string;
  showTerritory?: boolean;
  zoomLevel?: number;
  gpsQuality?: GPSQuality;
}

export default function MapView(props: MapViewProps) {
  return <WorkoutMap {...props} />;
}
