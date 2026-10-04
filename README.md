# MyFitAI 🏋️‍♂️🤖

An intelligent, full-featured AI-powered fitness, workout, and nutrition tracking application. Built with React 19, TypeScript, Vite, Tailwind CSS, Firebase, Google Gemini AI, and Capacitor for cross-platform Android support.

---

## 📌 Overview

**MyFitAI** is an all-in-one personal fitness companion designed to bridge the gap between workout tracking, nutrition planning, habit building, and AI coaching. Whether you're tracking daily macros, following a personalized training split, or asking your AI coach for recovery advice, MyFitAI provides an intuitive, high-performance experience on web and mobile.

---

## ✨ Features

### 🧠 Gemini-Powered AI Coach & Copilot
- **AI Fitness Coach & Copilot Chat**: Get instant, tailored workout tips, form advice, recovery suggestions, and motivation using Google's Gemini AI.
- **AI Workout Planner**: Automatically generate personalized workout programs based on your experience level, goal (hypertrophy, fat loss, strength), and available equipment.

### 🏋️ Workouts & Exercise Tracking
- **Interactive Workout Session**: Real-time workout tracking with exercise timers, set/rep counters, weight logging, and notes.
- **Visual Muscle Heatmap**: Interactive anatomical visualization highlighting target muscle groups (chest, back, shoulders, legs, core).
- **Exercise Library**: Searchable database of exercises categorized by muscle group with instructions and equipment filters.
- **Workout History**: Detailed log of completed sessions, personal records, and volume metrics.

### 🥗 Nutrition & Diet Monitoring
- **Macronutrient Tracking**: Track daily calories, protein, carbohydrates, and fats against target goals.
- **Rich Food Database**: Preloaded food directory, including comprehensive nutritional data for diverse and regional cuisines (such as Indian dishes).
- **Custom Meal Logging**: Quick-add meals and log custom food entries throughout the day.

### 💧 Health Hub & Wellness
- **Live Step Counter**: Monitor daily step progress toward walking targets.
- **Hydration Tracking**: Log water intake with quick-tap increments and hydration reminders.
- **Sleep & Recovery**: Track nightly sleep duration and monitor recovery quality.
- **Weight Check-in**: Record weight progression over time to visualize body composition changes.

### 🎮 Gamification & Community
- **Streaks & XP System**: Earn experience points and maintain daily active streaks to stay motivated.
- **Community Feed**: Share completed workouts, celebrate milestone achievements, and engage with other fitness enthusiasts.
- **Visual Analytics**: Interactive weekly and monthly charts tracking strength progression, weight trends, and consistency.

### ☁️ Cloud Sync & Offline Reliability
- **Firebase Authentication**: Secure user sign-up and login with email/password and state persistence.
- **Cloud Firestore**: Seamless multi-device synchronization for user profiles, workouts, meals, and history.
- **Local Fallback**: Robust local storage caching so you can log workouts even when offline.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend Framework** | [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vite.dev/) |
| **Styling & Design** | [Tailwind CSS v4](https://tailwindcss.com/), Responsive Glassmorphism & Modern Dark UI |
| **Mobile Runtime** | [Capacitor 8](https://capacitorjs.com/) (Android platform) |
| **AI Integration** | [Google Generative AI SDK](https://www.npmjs.com/package/@google/generative-ai) (Gemini Models) |
| **Backend & Cloud** | [Firebase](https://firebase.google.com/) (Authentication, Cloud Firestore, Storage) |
| **State Management** | React Context API (Auth, Fitness, Gamification, Theme, Onboarding, Preferences) |

---

## 📂 Project Structure

```bash
MyFitAI/
├── android/                    # Capacitor Android native project & Gradle build
│   └── app/build/outputs/apk/  # Generated Android APK builds
├── public/                     # Static web assets & icons
├── src/
│   ├── assets/                 # App images, logos, and illustrations
│   ├── components/             # Reusable UI components
│   │   ├── WorkoutBuilder.tsx  # Custom routine creator
│   │   ├── WorkoutSession/     # Active session tracker & timers
│   │   ├── MuscleHeatmap.tsx   # Visual muscle group indicator
│   │   ├── CopilotChat.tsx     # Floating AI copilot assistant
│   │   ├── ActivityLogger.tsx  # Quick activity & workout logger
│   │   └── BottomNavBar.tsx    # Mobile-optimized bottom navigation
│   ├── context/                # Global React contexts
│   │   ├── AuthContext.tsx     # Firebase user session state
│   │   ├── FitnessContext.tsx  # Workouts, nutrition & health logs
│   │   ├── GamificationContext.tsx # XP, level & streak engine
│   │   └── ThemeContext.tsx    # Dark/light appearance settings
│   ├── data/                   # Food, exercise & regional nutrition datasets
│   ├── pages/                  # Application views & routes
│   │   ├── Dashboard.tsx       # Main daily summary & activity overview
│   │   ├── WorkoutPlanner.tsx  # Routine generator & custom splits
│   │   ├── ActiveWorkout.tsx   # Live workout tracker
│   │   ├── NutritionPlanner.tsx# Meal logger & macro tracker
│   │   ├── HealthHub.tsx       # Sleep, steps & hydration
│   │   ├── Progress.tsx        # Charts & visual analytics
│   │   ├── Community.tsx       # Social feed & milestone sharing
│   │   ├── AICoach.tsx         # Dedicated Gemini fitness advisor
│   │   └── Settings.tsx        # Profile, preferences & account settings
│   ├── services/
│   │   ├── firebase.ts         # Firebase SDK initialization
│   │   ├── gemini.ts           # Google Gemini AI prompts & client
│   │   └── cloudSync.ts        # Firestore synchronization logic
│   ├── types/                  # TypeScript interface declarations
│   ├── utils/                  # Storage helpers & database adapters
│   ├── App.tsx                 # App layout & router routes
│   └── main.tsx                # React root mount
├── capacitor.config.ts         # Capacitor cross-platform configuration
├── package.json                # Project dependencies and npm scripts
└── vite.config.ts              # Vite bundler configuration
```

---

## ⚙️ Environment Variables

Create a `.env` file in the root directory (based on `.env.example`):

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Google Gemini AI
VITE_GEMINI_API_KEY=your_gemini_api_key
```

---

## 🚀 Getting Started

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/najibcode/MyFitAI.git
cd MyFitAI
```

### 2️⃣ Install Dependencies

```bash
npm install
```

### 3️⃣ Run Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` in your browser.

### 4️⃣ Build Web Production Bundle

```bash
npm run build
```

---

## 📱 Android Development & Building APK

MyFitAI is configured with **Capacitor** to run as a native Android application.

### Syncing Web Build with Android

Whenever you update your web code, rebuild and sync:

```bash
npm run build
npx cap sync android
```

### Building the Android APK (Command Line)

To assemble a debug APK using Gradle:

```bash
cd android
./gradlew assembleDebug
```

The generated APK will be located at:
```bash
android/app/build/outputs/apk/debug/app-debug.apk
```

### Installing the APK to a Device

Connect your Android device via USB (with USB Debugging enabled) and run:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

### Opening in Android Studio

To edit native configuration, run emulators, or build signed release APKs / App Bundles:

```bash
npx cap open android
```

---

## 📸 Screenshots

<p align="center">
  <img width="294" alt="MyFitAI Dashboard" src="https://github.com/user-attachments/assets/708bc704-8815-41ff-adab-2c8309912f7e" />
  &nbsp;&nbsp;
  <img width="292" alt="MyFitAI Workout Tracker" src="https://github.com/user-attachments/assets/c2c2d6e5-a1f0-4c59-adc2-a30f05619435" />
  &nbsp;&nbsp;
  <img width="321" alt="MyFitAI Progress" src="https://github.com/user-attachments/assets/e24134cd-0bea-49ac-9790-73a1801420f0" />
</p>

---

## 🎯 Roadmap

- [x] AI Workout Generation with Gemini API
- [x] Interactive Muscle Heatmap
- [x] Real-time Workout Timer & Set Logger
- [x] Nutrition & Regional Cuisine Database
- [x] Gamified Streaks & Community Feed
- [x] Capacitor Native Android Build
- [ ] AI-assisted Computer Vision Form Detection (Camera Pose Estimation)
- [ ] Wearable Integration (Health Connect, Google Fit, Apple Health)
- [ ] Offline Voice-Guided Workout Mode

---

## 🤝 Contributing

Contributions are always welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License**.

---

## 👨‍💻 Author

Developed with ❤️ by **Najib** ([@najibcode](https://github.com/najibcode))
