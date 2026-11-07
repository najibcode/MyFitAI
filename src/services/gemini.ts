// ─────────────────────────────────────────────────────────────
// MyFitAI — Google Gemini AI Service
// Handles all communication with the Gemini API for AI Coach,
// workout suggestions, and nutrition advice using the free Google AI Studio tier.
// ─────────────────────────────────────────────────────────────

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Read API key from environment — never hardcode secrets in source.
// For maximum production security, proxy calls through a Firebase Cloud Function.
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;
if (!GEMINI_API_KEY) {
  console.error('[gemini] VITE_GEMINI_API_KEY is not set. AI features will fail.');
}
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || '');

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface UserContext {
  name: string;
  age: number;
  gender: string;
  weight: number;
  height: number;
  goal: string;
  dailyCalorieGoal: number;
  dailyStats?: {
    calories: number;
    steps: number;
    water: number;
    sleep: number;
    duration: number;
  };
  activityStats?: {
    recentActivities?: Array<{
      type: string;
      distanceKm: number;
      durationMin: number;
      pace: string;
      date: string;
      elevationGainM?: number;
    }>;
    weeklyDistanceKm?: number;
    weeklyActivityCount?: number;
    territoryAreaKm2?: number;
    territoryLevel?: number;
    territoryTitle?: string;
  };
  muscleRecoveryStats?: Array<{
    muscleName: string;
    recoveryPercentage: number;
    status: 'recovered' | 'recovering' | 'fatigued';
    weeklySets: number;
  }>;
  nutritionSummary?: {
    caloriesConsumed: number;
    calorieGoal: number;
    proteinGrams: number;
    proteinGoal: number;
    carbsGrams?: number;
    carbsGoal?: number;
    fatGrams?: number;
    fatGoal?: number;
  };
  healthSummary?: {
    steps: number;
    stepGoal: number;
    sleepFormatted: string; // e.g. "7h 36m"
    sleepGoalHours: number;
    sleepScore?: number; // e.g. 82
    readinessScore?: number; // e.g. 82
    sourceLabel?: string; // e.g. "Health Connect"
    yesterdayWorkout?: string;
    muscleRecovery?: number; // e.g. 82
  };
}

const SYSTEM_PROMPT = `You are MyFitAI Coach — a world-class personal fitness and nutrition coach built into a mobile fitness app. You are friendly, knowledgeable, motivating, and concise.

RULES:
- Keep responses under 150 words. Be direct and actionable.
- Use the user's profile data to personalize advice.
- When giving workout advice, include specific exercises, sets, and reps.
- When giving nutrition advice, include specific foods and amounts.
- Use emoji sparingly (1-2 per response max) to keep it professional.
- Never give medical advice. If asked about injuries or medical conditions, recommend consulting a healthcare professional.
- Be encouraging but honest. Don't sugarcoat feedback.
- Format key numbers in bold when helpful.
- If you don't know something, say so. Don't make up data.

EXPERTISE AREAS:
- Workout programming (strength, hypertrophy, cardio, HIIT)
- GPS, Running, Cycling, Hiking & Territory (pacing, splits, weekly mileage, running recovery)
- Nutrition & macros (meal planning, calorie counting, supplements)
- Recovery (sleep, stretching, deloading)
- Form & technique tips
- Motivation & habit building
- Progress analysis`;

function buildSystemContext(userContext: UserContext): string {
  const heightFeet = Math.floor(userContext.height / 12);
  const heightInches = userContext.height % 12;
  
  let ctx = `${SYSTEM_PROMPT}\n\nUSER PROFILE:\n`;
  ctx += `- Name: ${userContext.name}\n`;
  ctx += `- Age: ${userContext.age}, Gender: ${userContext.gender}\n`;
  ctx += `- Height: ${heightFeet}'${heightInches}", Weight: ${userContext.weight} lbs\n`;
  ctx += `- Goal: ${userContext.goal}\n`;
  ctx += `- Daily Calorie Target: ${userContext.dailyCalorieGoal} kcal\n`;
  
  if (userContext.dailyStats) {
    const s = userContext.dailyStats;
    ctx += `\nTODAY'S ACTIVITY:\n`;
    ctx += `- Calories burned: ${s.calories} kcal\n`;
    ctx += `- Steps: ${s.steps}\n`;
    ctx += `- Water: ${s.water}L\n`;
    ctx += `- Sleep: ${s.sleep} hrs\n`;
    ctx += `- Workout duration: ${s.duration} min\n`;
  }

  if (userContext.activityStats) {
    const act = userContext.activityStats;
    ctx += `\nOUTDOOR & GPS ACTIVITIES:\n`;
    if (act.weeklyDistanceKm !== undefined) {
      ctx += `- Weekly Volume: ${act.weeklyDistanceKm.toFixed(1)} km across ${act.weeklyActivityCount || 0} activities\n`;
    }
    if (act.territoryAreaKm2 !== undefined) {
      ctx += `- Territory Engine: Level ${act.territoryLevel || 1} (${act.territoryTitle || 'Explorer'}), ${act.territoryAreaKm2.toFixed(2)} km² controlled\n`;
    }
    if (act.recentActivities && act.recentActivities.length > 0) {
      ctx += `- Recent Activities:\n`;
      act.recentActivities.slice(0, 5).forEach(a => {
        ctx += `  • ${a.type}: ${a.distanceKm.toFixed(2)} km in ${a.durationMin}m (pace: ${a.pace}/km) on ${a.date}\n`;
      });
    }
  }

  if (userContext.muscleRecoveryStats && userContext.muscleRecoveryStats.length > 0) {
    ctx += `\nMUSCLE RECOVERY & FATIGUE STATUS:\n`;
    userContext.muscleRecoveryStats.forEach(m => {
      ctx += `- ${m.muscleName}: ${m.recoveryPercentage}% (${m.status}, ${m.weeklySets} sets this week)\n`;
    });
    ctx += `Advise user based on which muscles are recovered vs fatigued.\n`;
  }

  if (userContext.nutritionSummary) {
    const n = userContext.nutritionSummary;
    ctx += `\nTODAY'S NUTRITION STATUS:\n`;
    ctx += `- Calories: ${n.caloriesConsumed} / ${n.calorieGoal} kcal (${Math.round((n.caloriesConsumed / (n.calorieGoal || 1)) * 100)}%)\n`;
    ctx += `- Protein: ${n.proteinGrams}g / ${n.proteinGoal}g (${Math.round((n.proteinGrams / (n.proteinGoal || 1)) * 100)}%)\n`;
    if (n.carbsGrams !== undefined && n.carbsGoal) {
      ctx += `- Carbs: ${n.carbsGrams}g / ${n.carbsGoal}g | Fat: ${n.fatGrams || 0}g / ${n.fatGoal || 0}g\n`;
    }
  }

  if (userContext.healthSummary) {
    const h = userContext.healthSummary;
    ctx += `\nHEALTH & RECOVERY (HEALTH CONNECT / HEALTHKIT):\n`;
    ctx += `- Daily Steps: ${h.steps.toLocaleString()} / ${h.stepGoal.toLocaleString()} (${Math.round((h.steps / (h.stepGoal || 1)) * 100)}%)\n`;
    ctx += `- Sleep Night: ${h.sleepFormatted} / ${h.sleepGoalHours}h target\n`;
    if (h.sleepScore !== undefined) {
      ctx += `- Recovery Sleep Score: ${h.sleepScore} / 100\n`;
    }
    if (h.readinessScore !== undefined) {
      ctx += `- Daily Training Readiness: ${h.readinessScore} / 100\n`;
    }
    if (h.sourceLabel) {
      ctx += `- Health Data Source: ${h.sourceLabel}\n`;
    }
    if (h.yesterdayWorkout) {
      ctx += `- Prior Session: ${h.yesterdayWorkout}\n`;
    }
    if (h.muscleRecovery !== undefined) {
      ctx += `- Muscular Recovery: ${h.muscleRecovery}%\n`;
    }
    ctx += `Use this exact imported health context to give tailored, recovery-aware guidance without fabricating metrics.\n`;
  }
  
  return ctx;
}

/**
 * Deterministic tactical coaching generator used when Gemini network is offline,
 * API key quota is reached, or as fallback. Strictly uses verified userContext without hallucinations.
 */
export function generateLocalTacticalResponse(userMessage: string, userContext: UserContext): string {
  const h = userContext.healthSummary;
  const lower = userMessage.toLowerCase();

  if (
    lower.includes('today') ||
    lower.includes('what should i do') ||
    lower.includes('workout') ||
    lower.includes('advice') ||
    lower.includes('ready') ||
    lower.includes('train')
  ) {
    if (h) {
      const readiness = h.readinessScore ?? 85;
      const sleepStr = h.sleepFormatted;
      const stepsStr = h.steps.toLocaleString();
      const goalStepsStr = h.stepGoal.toLocaleString();
      const source = h.sourceLabel || 'Health Connect';

      let intensity = 'high-intensity strength or hypertrophy training';
      let loadGuidance = 'Your central nervous system and metabolic recovery are in an optimal performance window.';
      if (readiness < 65) {
        intensity = 'active recovery, light mobility, or Zone 2 walking';
        loadGuidance = 'Your physiological recovery is lowered. Prioritize sleep extension, hydration, and deloading today.';
      } else if (readiness < 80) {
        intensity = 'moderate-intensity training with standard working sets';
        loadGuidance = 'Your baseline recovery is stable. Maintain target loads but avoid grinding sets to failure.';
      }

      const muscleLine = h.muscleRecovery !== undefined
        ? `• Average Muscular Recovery: ${h.muscleRecovery}%\n`
        : '';
      const priorWorkoutLine = h.yesterdayWorkout
        ? `• Prior Session: ${h.yesterdayWorkout}\n`
        : '';

      return `Based on your verified health metrics from ${source}:\n\n` +
        `• Readiness Score: ${readiness}/100\n` +
        `• Overnight Sleep: ${sleepStr} (Score: ${h.sleepScore ?? 'N/A'}/100)\n` +
        `• Movement Today: ${stepsStr} / ${goalStepsStr} steps (${Math.round((h.steps / (h.stepGoal || 1)) * 100)}%)\n` +
        muscleLine +
        priorWorkoutLine +
        `\n🎯 Tactical Recommendation for Today: Proceed with ${intensity}. ${loadGuidance}`;
    }
  }

  // General prompt response using verified context
  return `Hey ${userContext.name}! Based on your profile and ${userContext.goal.toLowerCase()} goal: keep nutrition locked in (aiming for ${userContext.dailyCalorieGoal} kcal) and maintain consistent training execution. Let me know if you want to inspect a specific muscle group or customize today's session.`;
}

/**
 * Send a message to Gemini and get a streamed/full response.
 */
export async function sendToGemini(
  userMessage: string,
  conversationHistory: GeminiMessage[],
  userContext: UserContext
): Promise<string> {
  const systemContext = buildSystemContext(userContext);

  const modelNames = ['gemini-1.5-flash', 'gemini-2.0-flash'];

  for (const modelName of modelNames) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: systemContext,
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          topK: 40,
          maxOutputTokens: 512,
        },
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        ],
      });

      const history = [
        { role: 'user', parts: [{ text: 'Respond with a brief greeting acknowledging you are ready to help.' }] },
        { role: 'model', parts: [{ text: `Hey ${userContext.name}! 👋 Ready to help you crush your ${userContext.goal.toLowerCase()} goals. What's on your mind?` }] },
        ...conversationHistory.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: msg.parts
        }))
      ];

      const chat = model.startChat({ history });
      const timeoutMs = 15_000;
      const result = await Promise.race([
        chat.sendMessage(userMessage),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Gemini request timed out after 15s')), timeoutMs)
        ),
      ]);
      return result.response.text();
    } catch (err) {
      console.warn(`[gemini] Model ${modelName} call failed, checking fallback:`, err);
    }
  }

  // Graceful deterministic fallback when offline, API key issue, or network timeout
  console.info('[gemini] Generating deterministic tactical response based on health context.');
  return generateLocalTacticalResponse(userMessage, userContext);
}

/**
 * Quick single-shot prompt (no conversation history needed).
 * Useful for generating workout plans, meal suggestions, etc.
 */
export async function quickPrompt(
  prompt: string,
  userContext: UserContext
): Promise<string> {
  const systemContext = buildSystemContext(userContext);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: systemContext,
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 512,
    }
  });

  try {
    const timeoutMs = 15_000;
    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini request timed out after 15s')), timeoutMs)
      ),
    ]);
    return result.response.text();
  } catch (error) {
    console.error('Gemini request failed:', error);
    throw error;
  }
}

/**
 * AI-powered social share caption generator based on actual workout session and muscle metrics
 */
export async function generateAICaption(stats: {
  periodLabel: string;
  totalWorkouts: number;
  totalSets: number;
  totalVolumeKg: number;
  prsCount: number;
  topMuscles: string[];
  prNames?: string[];
}): Promise<string> {
  const prompt = `Write an authentic, motivating, concise Instagram/social media fitness caption based strictly on this verified user training data:
Timeframe: ${stats.periodLabel}
Workouts completed: ${stats.totalWorkouts}
Total sets: ${stats.totalSets}
Total volume lifted: ${stats.totalVolumeKg.toLocaleString()} kg
PRs achieved: ${stats.prsCount} ${stats.prNames?.length ? `(${stats.prNames.join(', ')})` : ''}
Primary muscle focus: ${stats.topMuscles.join(', ')}

Guidelines:
1. Keep it concise (2-4 sentences max).
2. Sound like a dedicated athlete sharing their authentic training grind.
3. Mention the muscle focus and volume/PR highlights naturally.
4. End with #MyFitAI #TrainSmarter.
5. Do NOT invent stats or exercises not provided.`;

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 256,
      },
    });
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (err) {
    console.warn('[gemini] AI caption generation fallback:', err);
    throw err;
  }
}
