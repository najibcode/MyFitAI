# Contributing to MyFitAI 🏋️‍♂️

Thank you for your interest in contributing to **MyFitAI**! We appreciate your support in making fitness tracking, AI coaching, and nutrition planning better for everyone.

---

## 📋 Code of Conduct

Please be respectful, constructive, and collaborative in all discussions and pull requests.

---

## 🛠️ Development Setup

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/najibcode/MyFitAI.git
   cd MyFitAI
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy `.env.example` to `.env` and provide your development credentials:
   ```bash
   cp .env.example .env
   ```

4. **Start the local development server:**
   ```bash
   npm run dev
   ```

5. **Lint and Typecheck:**
   Before submitting code, ensure everything compiles cleanly:
   ```bash
   npm run build
   npm run lint
   ```

---

## 🌿 Branching & Git Workflow

1. Create a descriptive branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-description
   ```
2. Keep commits concise and meaningful:
   ```bash
   git commit -m "feat(workout): add superset support to active tracker"
   ```
3. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
4. Open a Pull Request on GitHub against the `main` branch with details on what changed and testing steps.

---

## 📱 Mobile (Android) Testing

If modifying mobile-specific styles or native features:
```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

---

## 📄 License

By contributing to MyFitAI, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
