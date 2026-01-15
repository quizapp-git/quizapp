# Player Quiz App – React Native Global Architecture Prompt

Use this prompt in MobPrompts to generate the **overall mobile architecture, navigation, and core flows** for the **player‑facing quiz app** built with React Native, reusing the **same Supabase database and backend** as the admin portal.

---

You are an expert **React Native, Supabase, and PERN‑stack engineer** designing a **full‑featured mobile quiz app** for players.  
This mobile app:

- Connects to an existing **PERN + Supabase + Vercel** backend and **admin portal**.  
- Uses the **same PostgreSQL/Supabase schema** as the admin portal (no new database).  
- Communicates only with **player‑facing `/api/app/...` APIs**, never with admin `/api/admin/...`.  
- Integrates **AdMob** (and future ad providers) to show **one ad after every question**, up to **10 questions and 10 ads per quiz session**.  
- Rewards users with **gold coins** that have a **PKR value**, with payouts and revenue sharing managed by the backend.

Your job is to generate a **detailed architecture and flow specification** for this React Native app, so that additional prompts can implement individual modules (wallet, friends, voice chat, etc.) on top of this foundation.

## Context

The system already has:

- An **Admin Portal** (web) that manages:
  - Question bank and quizzes (`questions`, `quizzes`, `quiz_questions`).  
  - Players and admins (`profiles`, `admin_profiles`).  
  - Coins and payouts (`coin_transactions`, `payout_requests`, `app_settings`).  
  - AdMob and revenue sharing (`admob_apps`, `ad_impressions`, `ad_revenue_snapshots`, `ad_revenue_shares`, `ad_revenue_user_distributions`).  
  - Audit logs and analytics (`audit_logs`, reporting prompts).

- **Player‑side backend APIs** under `/api/app/...` that:
  - Serve quizzes and questions.  
  - Manage quiz sessions (`user_quiz_sessions`).  
  - Track AdMob impressions.  
  - Expose wallet data and payout operations.  
  - Expose leaderboards and basic settings.

- Additional prompts for:
  - Ads module design (AdMob + future providers).  
  - Friends and quick chat.  
  - Groups chat.  
  - Voice chat and communication stages controlled by ads viewed.

You are now designing the **React Native mobile app** that is the **main interface for players** in this ecosystem.

## Tech Stack & Integration

Design the player app using:

- **Mobile stack**
  - React Native (TypeScript).  
  - React Navigation (Auth stack + Main tabs + nested stacks).  
  - Data layer with React Query (or similar) plus Context providers for:
    - Auth/session.  
    - Quiz sessions.  
    - Ads configuration and tracking.  
    - Optional chat/voice state.

- **Backend**
  - Supabase (PostgreSQL) with tables from the admin schema:
    - `profiles`, `admin_profiles`.  
    - `questions`, `quizzes`, `quiz_questions`, `user_quiz_sessions`.  
    - `admob_apps`, `ad_impressions`, `ad_revenue_snapshots`, `ad_revenue_shares`, `ad_revenue_user_distributions`.  
    - `coin_transactions`, `payout_requests`, `app_settings`, `audit_logs`.  
    - Voice/chat‑related tables such as `voice_rooms`, `voice_room_participants`, friends/groups tables where relevant.
  - Use only `/api/app/...` endpoints for the player app; do not call `/api/admin/...`.

## Navigation & App Shell

Design a clear navigation structure:

- **Auth Stack**
  - `SplashScreen` – checks Supabase session and routes to Auth or Main.  
  - `LoginScreen` – email/password login via Supabase Auth.  
  - `RegisterScreen` – registration using Supabase Auth and `profiles`.  
  - Optional `OnboardingScreen`.

- **Main Tab Navigator**
  - `HomeTab` – Quiz discovery and selection.  
  - `WalletTab` – Coins, PKR value, transactions, payouts.  
  - `LeaderboardTab` – Rankings by coins/earnings.  
  - `ProfileTab` – Profile, settings, communication stage, help.

Each tab can have its own stack:

- Home stack: `HomeScreen`, `QuizDetailsScreen`, `QuizPlayScreen`, `QuizResultScreen`, optional multiplayer lobby/room screens.  
- Wallet stack: `WalletScreen`, `PayoutRequestScreen`, `PayoutHistoryScreen`.  
- Leaderboard stack: `LeaderboardScreen`.  
- Profile stack: `ProfileScreen`, `SettingsScreen`, `HelpScreen`, future friends/groups/voice configuration screens.

Specify how navigation:

- Redirects from `SplashScreen` based on auth state.  
- Handles logout (clear Supabase session and local state).  
- Passes critical parameters like `quiz_id` and `session_id` between screens.

## Core Feature Areas

Define high‑level responsibilities for these areas, to be expanded in dedicated prompts:

1. **Auth & Profile**
   - Supabase Auth login/register flows.  
   - `GET /api/app/me` and `PUT /api/app/me` for profile and balances.  
   - Display of `coins_balance`, `lifetime_earned_coins`, PKR equivalent from `app_settings`.

2. **Quiz Discovery & Gameplay**
   - Fetch published quizzes via `GET /api/app/quizzes`.  
   - Show quiz metadata and rewards in `HomeScreen` and `QuizDetailsScreen`.  
   - Start sessions with `POST /api/app/quizzes/:id/start-session`.  
   - Play up to **10 questions** per session.  
   - Answer flow using `POST /answer` and `POST /complete`.  
   - Enforce **one AdMob ad after each question**, up to **10 ads**.

3. **Ads & Impressions**
   - Integrate Ads Module (AdMob first, provider‑agnostic design).  
   - Load config from `/api/app/ads/config` when available.  
   - Show interstitials after each answer using an `AdService`.  
   - Log impressions via `/api/app/ads/impression` or quiz session endpoints, aligned with `ad_impressions`.

4. **Wallet, Earnings & Payouts**
   - Wallet summary from `GET /api/app/wallet`.  
   - Transactions from `/wallet/transactions`.  
   - Payout settings, requests, and history via `/api/app/payout/...`.  
   - Respect `coins_to_pkr` and `withdrawal_threshold` from `app_settings`.

5. **Leaderboards**
   - Rankings via `GET /api/app/leaderboard`.  
   - Support for all‑time, weekly, monthly views.  
   - Highlight current user’s rank even outside top N.

6. **Friends, Groups, Chat & Voice (Future Modules)**
   - Hooks for friends list, quick chat, group chat, and voice rooms.  
   - Communication stages (preset chat → custom text → voice) controlled by ads viewed.  
   - Voice rooms and real‑time voice SDK integration, aligned with backend prompts.

## Backend Integration

Describe how the mobile app:

- Uses Supabase Auth for session management.  
- Attaches player identity to every `/api/app/...` request.  
- Restricts data to the authenticated user where appropriate.  
- Never exposes admin‑only fields or touches `/api/admin/...` routes.

Define how to handle:

- Loading, error, and empty states for all major screens.  
- Basic offline and retry behavior for quiz sessions and wallet operations.

## Ads & Business Rules

Ensure the architecture respects these invariants:

- Each quiz session:  
  - Max **10 questions**.  
  - Max **10 ad impressions**.  
- Ads appear **only after a user answers a question**, never before.  
- Coins and PKR values are always derived from server settings (`app_settings`).  
- Revenue sharing details shown in the wallet must align with admin‑side reports.

## Deliverables

From this prompt, generate:

1. A **React Native architecture proposal** for the player app: navigation, providers, data layer.  
2. A **screen map** listing all key screens and their responsibilities.  
3. A **flow description** for auth, quiz sessions, ads, wallet/payouts, leaderboards, and integration hooks for chat/voice.  
4. A **backend interaction map** showing which `/api/app/...` endpoints each screen calls.  
5. Clear notes on enforcing business rules: 10 questions per quiz session, 1 ad after each question, coins and PKR sourced from backend settings, and strict separation from admin portal APIs.

