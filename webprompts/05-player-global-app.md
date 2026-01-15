# Player Quiz App – Global System Prompt

Use this prompt in WebPrompts to generate the **overall architecture and base project setup** for the user‑facing quiz apps that integrate **AdMob** and share ad income with users.

Also see:
- The **AdMob & Mobile Ad Providers Integration Module** prompt for the dedicated Ads Module that implements the one‑ad‑per‑question behavior and tracks impressions across providers.
- The **Chat & Voice Access Policy Based on Ads Viewed** prompt for how per‑user ad impressions unlock preset chat, custom text chat, and voice chat in later modules.

---

You are an expert mobile and backend engineer designing the **player‑side quiz experience** that connects to an existing PERN + Supabase + Vercel backend and admin portal.

## Context

- There is already an **admin‑only portal** (built with PERN + Supabase) that manages:
  - Question bank and AI‑generated questions.
  - Quizzes (draft/published/archived).
  - Users, leaderboards.
  - Gold coins with PKR value.
  - Payouts and AdMob revenue sharing configuration.
- You are now building the **quiz apps that users install and use**.
- These quiz apps:
  - Use **AdMob** to show **one ad after every question**, up to **10 questions per quiz session**.
  - Generate ad income that is **shared with users** based on app settings and impressions.
  - Use the existing Supabase database and APIs to:
    - Fetch published quizzes and questions.
    - Record quiz sessions and answers.
    - Track ad impressions.
    - Credit users with gold coins and revenue share.
    - Allow users to request payouts.

## Tech Stack for Player App

Choose a stack suitable for mobile quiz apps with AdMob:

- **Preferred:** React Native (TypeScript) with Expo or bare React Native:
  - Android and iOS support.
  - AdMob integration via official or well‑maintained libraries.
- Backend:
  - Use the existing Supabase + Node/Next APIs (no new database).
  - Player‑facing APIs should be namespaced (e.g. `/api/app/...`) and separate from `/api/admin/...`.

Assume:

- Auth, coins, quizzes, AdMob data, and payouts are all controlled by the shared backend and schema (tables such as `profiles`, `quizzes`, `user_quiz_sessions`, `ad_impressions`, `coin_transactions`, `payout_requests`, `ad_revenue_user_distributions`, etc.).

## Core Player Experience

Design the player apps to support at least:

1. **Authentication & Profile**
   - Sign up/sign in (email, phone, or social, backed by Supabase Auth).
   - Profile screen with username, avatar (optional).
   - Show:
     - Current gold coin balance.
     - Lifetime earned coins.
     - PKR equivalent of current coins (using `coins_to_pkr` setting).

2. **Quiz Discovery & Selection**
   - Home/Lobby screen that lists **published** quizzes from the backend.
   - Filters by category, difficulty, popularity.
   - Show per quiz:
     - Title, description.
     - Number of questions (up to 10).
     - Difficulty.
     - Potential coin reward (per correct answer or per quiz, depending on backend rules).

3. **Quiz Gameplay**
   - For a selected quiz:
     - Start a **quiz session** recorded in `user_quiz_sessions`.
     - Show one question at a time with multiple‑choice options.
     - After the user answers a question:
       - Show immediate feedback (correct/incorrect).
       - **Trigger an AdMob ad** after each question.
       - Record an **ad impression** (with question index 1–10) in `ad_impressions` or via API.
     - Limit:
       - Maximum 10 questions per quiz session.
       - One ad shown after each question, up to 10 ads for a full quiz.
   - At end of quiz:
     - Show score, correct answers count.
     - Show coins earned for this session.
     - Persist `user_quiz_sessions` and any coin updates via backend APIs.

4. **Coins, Earnings, and Payouts**
   - Wallet/Earnings screen:
     - Show current coins.
     - PKR equivalent based on current `coins_to_pkr`.
     - History:
       - `coin_transactions` (earn, spend, adjustment, withdrawal, ad_revenue_share).
       - Show description and date.
   - Revenue sharing:
     - Show accumulated earnings from AdMob revenue share (based on `ad_revenue_user_distributions`).
   - Payout requests:
     - Allow user to **request withdrawal**:
       - Input coins or PKR amount.
       - Show conversion and enforce **minimum PKR threshold** from `withdrawal_threshold` (e.g. 500 PKR).
       - Choose payout method:
         - Bank transfer (account title, account number, bank name).
         - Easypaisa.
         - JazzCash.
       - Submit payout request via backend API, which creates a `payout_requests` row and adjusts coins accordingly.
     - Show payout history and statuses (pending, approved, rejected, paid).

5. **Leaderboards and Social Proof**
   - Leaderboard screen:
     - All‑time, weekly, monthly tabs.
     - Ranking by coins or PKR earnings.
   - Show user’s rank and stats on the leaderboard.

6. **Settings & Help**
   - Basic app settings (theme, notifications).
   - Help/FAQ screen to explain:
     - How quizzes work.
     - How ads and revenue sharing work (1 ad after each question, up to 10).
     - How coins convert to PKR and how withdrawals work.

## Deliverables

From this prompt, generate:

1. A **React Native app architecture proposal**:
   - Navigation structure (e.g. stack/tab navigators).
   - Screens and their responsibilities.
   - State management approach (Context, Redux, or query library).
2. A **module breakdown** that matches the backend and admin portal:
   - Auth & Profile.
   - Quiz Discovery & Gameplay.
   - AdMob Integration & Ad Impression Tracking.
   - Earnings & Wallet.
   - Payout Requests & History.
   - Leaderboards.
   - Settings & Help.
3. Integration points with the existing Supabase + Node/Next backend:
   - Which `/api/app/...` endpoints will be called from which screens.
   - High‑level error handling and offline considerations.

Make sure the design respects the constraints:

- One AdMob ad after every question.  
- Up to 10 questions and 10 ads per quiz session.  
- Ad income is shared with users via coins/PKR based on backend settings.
