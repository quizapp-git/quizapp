# Player Quiz App – Mobile UI Prompt (React Native + AdMob)

Use this prompt in WebPrompts to generate the **React Native mobile UI** for the user‑facing quiz app, with **AdMob integration** and earnings display.

---

You are building a **React Native** quiz app (TypeScript) that connects to the `/api/app/...` backend described in the previous prompt and to the existing Supabase database.

## Tech & Libraries

- React Native (TypeScript), with either:
  - Expo managed workflow, or
  - Bare React Native (specify which in the generated plan).
- Networking: `fetch` or a lightweight HTTP client.
- Navigation: React Navigation (stack + tabs).
- State/data: Context + React Query (or similar) for server data.
- AdMob: Official or well‑maintained AdMob library for:
  - Interstitial ads (shown after each question).

## App Navigation Structure

Design navigation with:

- Auth stack:
  - Splash/Loading screen (checks existing session).
  - Login/Register screens (Supabase Auth).
- Main tab navigator:
  - Home (Quizzes).
  - Wallet/Earnings.
  - Leaderboard.
  - Profile/Settings.

Each tab can have nested stack screens as needed.

## Screens & Flows

### 1. Auth & Onboarding

- **SplashScreen**
  - Checks if user is logged in via Supabase.
  - Navigates to Auth stack or Main tabs.

- **LoginScreen**
  - Email/password form.
  - Integrates with Supabase Auth; handles errors.

- **RegisterScreen**
  - Registration fields (email, password, username).
  - After registration, create a `profiles` entry if needed.

### 2. Home / Quiz Discovery

- **HomeScreen**
  - Shows list of available **published** quizzes from `/api/app/quizzes`.
  - Cards with title, description, difficulty, number of questions (up to 10), expected rewards.
  - Filters and simple search bar.
  - Tap on quiz → `QuizDetailsScreen`.

- **QuizDetailsScreen**
  - Shows quiz info and simple breakdown of rewards.
  - “Start Quiz” button → initiates session via `/start-session` endpoint and navigates to `QuizPlayScreen`.

### 3. Quiz Gameplay with AdMob

- **QuizPlayScreen**
  - Receives `quiz_id` and `session_id`.
  - Fetches questions (without correct answers) from `/api/app/quizzes/:id`.
  - Shows questions one by one:
    - Question text.
    - Multiple‑choice answer buttons.
  - On answer:
    - Call `/answer` endpoint to validate/store answer.
    - Show immediate feedback (correct/incorrect).
    - Then:
      - Load and show an **AdMob interstitial ad**.
      - After the ad closes, continue to next question.
    - Also call `/record-ad-impression` with `question_index` and appropriate identifiers.
  - Enforce:
    - Max 10 total questions for the quiz session.
    - Handle AdMob load failures gracefully (continue quiz even if ad fails).
  - At the end:
    - Call `/complete` endpoint to finalize session and compute coins.
    - Navigate to `QuizResultScreen`.

- **QuizResultScreen**
  - Shows:
    - Score and correct answers.
    - Coins earned in this session.
    - Updated balances.
  - Buttons:
    - “Play Again”.
    - “Back to Home”.

### 4. Wallet & Earnings

- **WalletScreen**
  - Uses `/api/app/wallet` and `/wallet/transactions`.
  - Shows:
    - Current coins.
    - PKR equivalent.
    - Summary of coins from quizzes vs AdMob revenue share.
  - List of transactions:
    - Type (earn, spend, ad_revenue_share, withdrawal).
    - Amount (coins and PKR at time).
    - Description and date.

- **PayoutRequestScreen**
  - Uses `/api/app/payout/settings` to show:
    - Coin value (PKR).
    - Minimum withdrawal threshold (e.g. 500 PKR).
    - Available methods: bank transfer, Easypaisa, JazzCash.
  - Form:
    - Input coins or PKR amount.
    - Choose method.
    - Enter method details:
      - Bank: account title, account number, bank name.
      - Easypaisa/JazzCash: account name and mobile number.
  - Shows computed `pkr_amount` and validation errors (below threshold, not enough coins).
  - Submit → calls `POST /api/app/payout/requests`, then shows success/error state.

- **PayoutHistoryScreen**
  - Uses `/api/app/payout/requests`.
  - Shows list of payout requests with status and timestamps.

### 5. Leaderboard

- **LeaderboardScreen**
  - Tabs or segmented control for:
    - All‑time.
    - Weekly.
    - Monthly.
  - Calls `/api/app/leaderboard` with selected period.
  - Displays:
    - Rank.
    - Username.
    - Coins/earnings used for rank.
    - Quizzes played.
  - Highlight current user’s row.

### 6. Profile & Settings

- **ProfileScreen**
  - Shows basic user info from `/api/app/me`.
  - Form to update username and other profile fields via `PUT /api/app/me`.

- **SettingsScreen**
  - Toggles (e.g. sound, notifications).
  - Link to **Help**.
  - Logout button (Supabase sign out).

- **HelpScreen**
  - Explains:
    - Quiz rules.
    - Ad policy: 1 ad after each question, up to 10 per quiz.
    - How coins are earned and shared from AdMob revenue.
    - How coin → PKR conversion and withdrawals work.

## Implementation Requirements

From this prompt, generate:

- A React Native project structure and navigation setup.  
- Screen components and their responsibilities.  
- Example code snippets that:
  - Call the defined `/api/app/...` endpoints.
  - Integrate AdMob interstitial ads on the **post‑answer** step for each question.
  - Handle loading, error, and empty states cleanly.

Ensure that:

- The user experience is smooth even if an ad fails to load.  
- Quiz sessions never exceed 10 questions or 10 ad impressions.  
- Earnings and payout information is clearly and transparently displayed to users.

