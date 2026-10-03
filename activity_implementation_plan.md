# MyFitAI — Activity, GPS & Territory Engine Implementation Plan

## Phase 1: Codebase Audit & Architectural Plan

### 1. Existing Functionality Audit

| Existing Component / File | Reusable Functionality | Required Modification | New Component Needed |
| :--- | :--- | :--- | :--- |
| `package.json` | React 19, TypeScript 5.9, Vite 8, Tailwind v4, Capacitor 8.3, Firebase 12.13 | Add testing support for activity engine | None |
| `src/utils/db.ts` | IndexedDB user-scoped connection cache (`BASE_DB_NAME_${uid}`), version management, transaction helpers | Upgrade to `DB_VERSION = 4`. Add 7 stores: `activities`, `activityRawRoutes`, `activityGoals`, `activityPRs`, `territoryCells`, `territoryStats`, `activitySyncQueue`. | Store wrappers & backup exports |
| `src/context/FitnessContext.tsx` | `dailyStats`, `logActivity`, user profile (weight, height, age, goal) | Auto-ingest completed GPS activities into daily timeline and calorie burn | Seamless coordination with `ActivityContext` |
| `src/context/NutritionContext.tsx` | Centralized daily energy summary (`DailyNutritionSummary`), calorie budget | Read `exerciseCaloriesBurned` from activity engine when user enables exercise calorie budget adjustment | Optional workout calories toggle |
| `src/services/gemini.ts` | Gemini 2.0 Flash AI coach with system prompt and context builder | Expand `UserContext` with activity stats: weekly distance, recent runs/rides, territory captured, PRs | Enhanced system context |
| `src/components/BottomNavBar.tsx` | Fixed bottom floating glassmorphism navigation | Add `/activity` tab between Workout and Nutrition | Main navigation integration |
| `src/pages/Dashboard.tsx` | Home screen activity rings, quick stats, macros, streak | Display live running/cycling activity cards, weekly mileage, territory badge | Dashboard activity widget |
| `firestore.rules` | User-scoped document protection (`users/{userId}`) | Add rules for `activities`, `activityGoals`, `activityPRs`, `territoryCells`, `territoryStats` | Cloud security rules |
| `android/app/src/main/AndroidManifest.xml` | Basic permissions (Internet) | Add `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, location hardware feature | Native Android permissions |

---

### 2. High-Level Architecture

```
                    ┌───────────────────────────────────┐
                    │      Active GPS Tracking Engine   │
                    │   (Adaptive Sampling, 3-10s,      │
                    │    Auto-pause, Jitter Filter)     │
                    └─────────────────┬─────────────────┘
                                      │ Raw GPS buffer (15s)
                                      ▼
                    ┌───────────────────────────────────┐
                    │       Local IndexedDB Layer       │
                    │    (activityRawRoutes, offline)   │
                    └─────────────────┬─────────────────┘
                                      │ Activity Finished
                                      ▼
                    ┌───────────────────────────────────┐
                    │    Central Activity Calculations   │
                    │  • Haversine Distance             │
                    │  • Elevation Gain/Loss            │
                    │  • 1km/1mi Splits                 │
                    │  • MET Calorie Estimation         │
                    │  • PR Detection                   │
                    │  • Douglas-Peucker Simplification │
                    │  • Anti-Cheat & Anti-Farming      │
                    └─────────────────┬─────────────────┘
                                      │
            ┌─────────────────────────┴─────────────────────────┐
            ▼                                                   ▼
┌───────────────────────┐                           ┌───────────────────────┐
│   Territory Engine    │                           │  Single Cloud Sync    │
│ • Grid Cell Generator │                           │  • 1 doc / activity   │
│ • Ownership & Overlap │                           │  • Compressed route   │
│ • Defense Counter     │                           │  • Minimal Firestore  │
│ • XP / Level Award    │                           │    read/write costs   │
└───────────────────────┘                           └───────────────────────┘
```

---

### 3. Implementation Phases
1. **Phase 1:** Codebase Audit & Implementation Plan (Completed)
2. **Phase 2:** Domain Model Types (`src/types/activity.ts`)
3. **Phase 3:** Central Activity & Territory Calculation Engine (`src/engine/activityCalculations.ts`)
4. **Phase 4:** Database Layer Upgrade (`src/utils/db.ts` to `DB_VERSION = 4`)
5. **Phase 5:** GPS Tracking Service with Adaptive Sampling & Auto-pause (`src/services/activity/gpsTracker.ts`)
6. **Phase 6:** Lightweight Map Provider Service & Viewport-Based Territory Renderer (`src/services/activity/MapService.ts` & `src/components/activity/MapView.tsx`)
7. **Phase 7:** Territory Game Engine (`src/services/activity/territoryEngine.ts`)
8. **Phase 8:** Activity Context & State Provider (`src/context/ActivityContext.tsx`)
9. **Phase 9:** UI Screens:
   - `src/pages/ActivityHub.tsx` (Home, Live Active Tracker Modal, Map/Territory, History, Analytics, Goals)
   - `src/components/activity/LiveActivityTracker.tsx`
   - `src/components/activity/ActivityDetailModal.tsx`
   - `src/components/activity/ActivityExportImportModal.tsx`
10. **Phase 10:** Integration with Dashboard, Workout, Nutrition & AI Coach
11. **Phase 11:** Unit Testing & Verification (`src/engine/__tests__/activityEngine.test.ts`)
12. **Phase 12:** Android / Capacitor permissions & build verification
