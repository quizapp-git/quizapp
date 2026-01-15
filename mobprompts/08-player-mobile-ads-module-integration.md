# Player Quiz App – Mobile AdMob & Ad Providers Integration Prompt

Use this prompt in MobPrompts to generate the **mobile Ads Module** for the React Native player app, aligned with the backend Ads & Revenue design.

---

You are an expert **mobile ads and monetization engineer** implementing a **provider‑agnostic Ads Module** in the player app.  
This module:

- Uses **AdMob** as the primary provider.  
- Is designed to support additional providers (Meta, Unity, AppLovin, etc.).  
- Enforces the quiz rule: **one ad after each question, up to 10 ads per session**.  
- Logs impressions consistently with the backend schema.

## Context

From backend Ads prompts:

- Tables:
  - `admob_apps`.  
  - `ad_impressions` with fields for user, session, quiz, provider, placement, question index, etc.  
  - `ad_revenue_snapshots`, `ad_revenue_shares`, `ad_revenue_user_distributions`.  
  - Possibly `ad_providers` or `app_ad_settings` for configuration.

- APIs:
  - `/api/app/ads/config` for configuration.  
  - `/api/app/ads/impression`, `/ads/click`, `/ads/event` for logging.  
  - Quiz session endpoints also able to log impressions.

Quiz constraints:

- `max_ads_per_quiz_session` default 10.  
- Ads shown only after answering questions.

## Tech Stack

- React Native (TypeScript).  
- Ad SDK:
  - A well‑maintained React Native AdMob library.  
  - Potential placeholders for other providers.  
- React context for Ads Module.

## Ads Module Design

Design a provider‑agnostic layer:

- **Interfaces**
  - `AdProvider` interface with methods:
    - `initialize(config)`.  
    - `preloadInterstitial(placementId)`.  
    - `showInterstitial(placementId): Promise<AdResult>`.  
  - Optional methods for rewarded and banner ads:
    - `preloadRewarded`, `showRewarded`, `loadBanner`, etc.  
  - Event callbacks:
    - `onAdLoaded`, `onAdFailedToLoad`, `onAdShown`, `onAdClicked`, `onAdClosed`.

- **AdService**
  - Uses provider(s) to:
    - Load config from `/api/app/ads/config`.  
    - For quiz placements, exposes:
      - `showQuizInterstitial(questionIndex, context): Promise<AdResultWithMeta>`.  
    - Tracks:
      - Ads shown this session.  
      - Enforced `max_ads_per_quiz_session`.  
  - Chooses provider based on config (AdMob by default, weights for others).

- **AdMobProvider**
  - Wraps AdMob SDK functions.  
  - Handles:
    - App initialization with IDs.  
    - Platform‑specific ad unit IDs.  
    - Test vs production ad units.  
    - Proper handling of lifecycle events and errors.

## Integration with Quiz Flow

Describe how Ads Module is used in `QuizPlayScreen`:

- After each question is answered and feedback is shown:
  - Call `AdService.showQuizInterstitial(questionIndex, context)`.  
  - Wait for ad to be shown or fail.  
  - Regardless of outcome, move to next question.  
  - Do not exceed `max_ads_per_quiz_session`.

- Ensure:
  - No ads are shown outside quiz context unless explicitly configured.  
  - The user experience is not blocked by repeated ad failures.

## Impression Logging

Define how to log ad events:

- After each ad show attempt:
  - Call `/api/app/ads/impression` (or quiz session logging endpoint) with:
    - `provider`.  
    - `ad_type` (INTERSTITIAL, etc.).  
    - `placement` (e.g. `QUIZ_AFTER_QUESTION`).  
    - `quiz_id`, `session_id`, `question_index`.  
    - Client timestamp.

- Optionally log:
  - Clicks via `/api/app/ads/click`.  
  - Failures via `/api/app/ads/event`.

Ensure logs align with fields in `ad_impressions` and can feed revenue sharing calculations.

## Privacy, Consent & Test Mode

Describe:

- How to:
  - Enable test ads and test devices in development builds.  
  - Switch to production ad units via config.  
- How to:
  - Respect privacy regulations (GDPR, personalized vs non‑personalized ads).  
  - Integrate with a consent SDK or OS‑level preferences if required.

## Deliverables

From this prompt, generate:

1. A detailed design for `AdProvider` interfaces and `AdService`.  
2. An AdMob provider implementation plan for React Native.  
3. Integration notes for quiz flow enforcement of 10 ads max and post‑answer timing.  
4. Logging patterns that correctly populate `ad_impressions` and related tables.  
5. Guidance on configuration, privacy, and test vs production behavior.

