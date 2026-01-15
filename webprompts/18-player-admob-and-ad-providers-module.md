# Player Quiz App – AdMob & Mobile Ad Providers Integration Module Prompt

Use this prompt in WebPrompts to design and implement a **modular ad integration layer** for the player mobile app and backend that supports **AdMob first**, with the ability to plug in **other mobile ad providers** later (e.g. Meta Audience Network, Unity Ads, AppLovin, etc.).

---

You are an expert mobile and backend engineer extending the **player-facing quiz app** (React Native + Supabase + PERN backend) to have a clean, configurable, and testable **Ads Module**.

## Context

- Existing system:
  - Admin portal (PERN + Supabase + Vercel) manages:
    - Quizzes and question bank.
    - Gold coins and PKR conversion.
    - Payouts and AdMob revenue sharing rules.
  - Player app (React Native, TypeScript) already:
    - Plays quizzes with **1 ad after every question**, up to **10 questions (10 ads) per quiz session**.
    - Tracks ad impressions in the backend (`ad_impressions`, `ad_revenue_user_distributions`, etc.).
    - Shares ad income with players via coins/PKR.
  - Additional modules (from other prompts):
    - Friends + quick chat (predefined and potentially custom text).
    - Voice chat and voice rooms.
    - Player profile and communication policy tied to ads viewed.
- New requirement:
  - Build a **dedicated ads integration module** that:
    - Uses **AdMob** as the primary provider.
    - Is designed to support **multiple ad providers** in the future without rewriting app logic.

Assume:

- You already have an AdMob account and app IDs for Android/iOS.
- You may integrate other networks either:
  - Directly via their SDKs, or
  - Via an ad mediation setup (e.g. AdMob mediation).

## Goals of the Ads Module

Design an Ads Module that:

1. Abstracts away provider-specific SDK details from the rest of the app.
2. Enforces quiz app constraints:
   - **Exactly one ad after each question**, up to **10 ads per quiz session**.
3. Supports ad types:
   - Interstitial ads (primary).
   - Rewarded ads or rewarded interstitials (optional, for bonus coins).
   - Banner ads (optional, for home or non-game screens).
4. Reports:
   - Ad impressions, clicks, failures.
   - Mapped to user, quiz session, question index, and provider.
5. Is configurable from the backend/admin portal:
   - Enable/disable specific providers.
   - Set probability/priority for each provider.
   - Configure ad unit IDs per platform and environment (dev/stage/prod).

## Mobile App Architecture – Ads Layer

Design a **provider-agnostic Ads Layer** in React Native:

1. Core interfaces:
   - Define TypeScript interfaces for ad providers, e.g.:
     - `AdProvider` with methods:
       - `initialize(config)`.
       - `preloadInterstitial(placementId)`.
       - `showInterstitial(placementId): Promise<AdResult>`.
       - `preloadRewarded(placementId)`.
       - `showRewarded(placementId): Promise<RewardResult>`.
       - Optional banner support.
     - Events/callbacks for:
       - `onAdLoaded`, `onAdFailedToLoad`, `onAdShown`, `onAdClicked`, `onAdClosed`.
   - `AdPlacement` concept:
     - E.g. `QUIZ_AFTER_QUESTION`, `HOME_BANNER`, `BONUS_REWARD`.
2. AdMob implementation:
   - Implement `AdMobProvider` using a React Native AdMob library (choose a well-maintained one).
   - Handle:
     - Initialization with app IDs.
     - Platform-specific ad unit IDs (Android/iOS, test vs production).
     - Error handling and retry logic.
3. Additional provider placeholders:
   - Create stubs/interfaces for other providers:
     - `MetaAudienceNetworkProvider`, `UnityAdsProvider`, etc.
   - Actual implementations can be filled in later, but the interface and selection logic must be ready.
4. Provider selection/orchestration:
   - `AdService`:
     - Reads a **provider configuration** from backend or local config.
     - For a requested placement:
       - Chooses a provider (e.g. AdMob by default, others based on weights).
       - Calls the provider’s `preload` and `show` methods.
     - Exposes a simple API to the rest of the app:
       - `showQuizInterstitial(questionIndex, context): Promise<AdResultWithMeta>`.
5. Quiz flow integration:
   - In `QuizPlayScreen`:
     - After the user answers a question and sees feedback:
       - Call the Ads Module to show an interstitial, respecting:
         - Max 10 questions/ads.
         - Nowhere else in the session should ads appear.
     - Ensure:
       - Quiz UI waits appropriately for the ad to show/close.
       - If ad fails to load, the game continues smoothly with no hard crash.

Be explicit about how hooks/components (e.g. `useAds()` or `AdProvider` React context) wrap the app.

## Backend Integration & Tracking

Design backend support to track and control ad behavior:

1. Ad configuration:
   - Add an `ad_providers` or `app_ad_settings` table:
     - Fields:
       - `provider` enum: `ADMOB`, `META`, `UNITY`, `APPLOVIN`, etc.
       - `is_enabled` boolean.
       - `weight` or `priority` for selection.
       - `platform` (`android`, `ios`, `both`).
       - `ad_unit_interstitial`, `ad_unit_rewarded`, `ad_unit_banner`.
       - `environment` (`dev`, `staging`, `prod`).
   - Global app-level settings:
     - `ads_enabled` boolean.
     - `max_ads_per_quiz_session` (default 10).
     - `show_ad_after_every_question` (boolean).
2. Ad impression logging:
   - Extend or confirm schema of `ad_impressions`:
     - `id` uuid pk.
     - `user_id` references `profiles(id)`.
     - `session_id` references `user_quiz_sessions(id)` null.
     - `quiz_id` references `quizzes(id)` null.
     - `question_index` integer (1–10).
     - `provider` enum (`ADMOB`, etc.).
     - `placement` text (`QUIZ_AFTER_QUESTION`, etc.).
     - `ad_type` (`INTERSTITIAL`, `REWARDED`, `BANNER`).
     - `served_at` timestamptz.
     - `clicked` boolean default false.
     - `click_at` timestamptz null.
   - Optional `ad_events` table for detailed logs (load fail, show fail).
3. Revenue mapping:
   - If possible, correlate:
     - Aggregated provider reports with:
       - Impressions and eCPM.
       - Per-user or per-segment earnings in `ad_revenue_user_distributions`.
   - Keep design generic so **any provider’s revenue** can be mapped into the same internal model.

Define the API shape that mobile will use to fetch ad configuration (e.g. `/api/app/ads/config`).

## API Design – Ads Config & Reporting

Design REST or RPC endpoints under `/api/app/ads/...`:

1. `GET /api/app/ads/config`
   - Returns:
     - Enabled providers and their weights.
     - Ad unit IDs for the current platform and environment.
     - Global flags: `ads_enabled`, `max_ads_per_quiz_session`, `show_ad_after_every_question`.
   - Used at app startup / periodically to configure the Ads Module.
2. `POST /api/app/ads/impression`
   - Body:
     - `provider`.
     - `ad_type`.
     - `placement`.
     - `quiz_id`, `session_id`, `question_index`.
     - Client timestamp and device info (if needed).
   - Behavior:
     - Log to `ad_impressions`.
     - Optionally trigger updates to `user_ad_stats` and revenue share calculations.
3. `POST /api/app/ads/click`
   - Body:
     - Reference to an impression ID or same metadata.
   - Behavior:
     - Mark impression as clicked.
4. Optional:
   - `POST /api/app/ads/event`
     - For load/show failures, with error codes and provider info.

Specify authentication (must be logged-in player) and rate limiting considerations.

## Admin Portal – Ad Management & Monitoring

Design how the admin portal will manage ad providers and monitor performance:

1. Configuration UI:
   - Screen for **Ad Providers & Units**:
     - For each provider:
       - Enable/disable.
       - Set weights/priorities.
       - Configure ad unit IDs per platform/environment.
   - Screen for **Ad Rules**:
     - Set `max_ads_per_quiz_session`.
     - Enable/disable ads in certain areas of the app.
2. Reporting & analytics:
   - Charts/tables showing:
     - Impressions and clicks per provider, per day.
     - Fill rate and error rates (if events collected).
     - Revenue per provider (if integrated).
   - Breakdown by:
     - Quiz category.
     - Country or region.
     - Player segments (e.g. communication stage, high earners).

Make sure the design reuses existing analytics/reporting patterns from the admin portal prompts.

## Mobile UX Considerations

Ensure ad integration does not harm the quiz experience:

1. Quiz flow:
   - Ad timing:
     - Only after answering a question, never before.
     - Limit to max 10 ads per full quiz session.
   - If an ad fails:
     - Do not block the user.
     - Log the error and continue.
2. UI/UX:
   - Provide smooth transitions into and out of interstitials.
   - Ensure that **quick chat**, **voice chat**, and **other UI**:
     - Pause or hide appropriately during ads.
     - Resume cleanly afterwards.
3. Consent & privacy:
   - Respect platform-level privacy (GDPR, consent for personalized ads).
   - Integrate with any consent SDK if needed.

Describe how to handle test mode (test ads, test devices) in development builds.

## Multiple Ad Providers & Mediation Strategy

Design for flexibility with other providers:

1. Single primary provider (AdMob) now:
   - Implement AdMob completely.
   - Make other providers optional.
2. Future multi-provider strategy:
   - Two options:
     - Use **AdMob mediation**:
       - AdMob SDK chooses which network to serve based on mediation settings.
       - The app still only talks to AdMob directly.
     - Or **app-level mediation**:
       - The `AdService` chooses provider based on configuration and weights.
       - Calls specific SDKs for each provider.
   - Design the Ads Module so it can support both approaches with minimal change.

Be explicit about pros/cons and how to switch strategies later.

## Integration with Player Earnings & Policies

Connect the Ads Module with:

1. Player earnings:
   - Ensure each recorded impression can eventually contribute to:
     - Coins and PKR assigned to the player via `ad_revenue_user_distributions`.
2. Communication policy (ads → chat/voice unlocks):
   - Ensure `user_ad_stats.total_ads_viewed` is updated consistently.
   - This value is used by the **communication policy** module to:
     - Unlock predefined chat → custom text → voice chat at configured thresholds.

Make sure this integration is described clearly so different teams (ads, chat, voice, earnings) can align on the same counters and definitions.

## Deliverables

From this prompt, generate:

1. React Native Ads Module:
   - Provider-agnostic interfaces.
   - AdMob provider implementation.
   - `AdService` orchestration and quiz flow integration.
2. Backend schema and APIs:
   - Ad provider and ad unit configuration tables.
   - Impression/click/event logging tables.
   - `/api/app/ads/config`, `/api/app/ads/impression`, `/api/app/ads/click`, etc.
3. Admin portal features:
   - Screens to configure providers, units, and rules.
   - Reports for impressions, clicks, errors, and revenue per provider.
4. Integration notes:
   - How the Ads Module respects quiz constraints (1 ad per question, max 10).
   - How ad data feeds into player earnings and communication unlock policies.

Design it so you can start with **AdMob only**, but add more providers and mediation later without rewriting the quiz logic.

