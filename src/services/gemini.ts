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
  
  return ctx;
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
  
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
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

  try {
    const chat = model.startChat({ history });
    // 15s timeout to prevent indefinite hang on flaky mobile networks
    const timeoutMs = 15_000;
    const result = await Promise.race([
      chat.sendMessage(userMessage),
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
