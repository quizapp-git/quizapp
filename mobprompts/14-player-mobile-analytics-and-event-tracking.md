# Player Quiz App – Mobile Analytics & Event Tracking Prompt

Use this prompt in MobPrompts to generate the **analytics and event tracking strategy** for the player‑facing React Native quiz app, aligned with admin reporting and revenue analytics.

---

You are an expert **analytics and instrumentation engineer** designing how the mobile app:

- Tracks user actions and funnels.  
- Sends events to analytics tools.  
- Provides data that feeds admin dashboards and AI revenue insights.

## Context

Admin prompts already cover:

- Reporting and analytics for:
  - Quiz performance.  
  - Ad revenue and revenue sharing.  
  - Payouts and liabilities.  
  - Player behavior.

You must define mobile event tracking that:

- Matches backend needs without duplicating server‑side metrics.  
- Avoids storing sensitive data unnecessarily.  
- Works offline with buffering when needed.

## Tech & Integration

- React Native (TypeScript).  
- Analytics client(s), e.g.:
  - Segment, Amplitude, Mixpanel, Firebase Analytics, or custom events via backend.  
- Shared analytics module:
  - Central place to define event names and properties.  
  - Wrapper around chosen providers and/or custom `/api/app/analytics` endpoint.

## Event Model

Define key events grouped by area:

- Auth & onboarding:
  - `auth_login_success`, `auth_login_failure`.  
  - `auth_signup_success`.  
  - `onboarding_viewed_page`, `onboarding_completed`, `onboarding_skipped`.

- Quiz & ads:
  - `quiz_started`, `quiz_completed`.  
  - `question_answered` with correctness, question index, and quiz metadata (non‑PII).  
  - `ad_shown`, `ad_failed`, `ad_clicked` with provider and placement context.

- Wallet & payouts:
  - `wallet_viewed`.  
  - `payout_initiated`, `payout_submitted`, `payout_failed`.  
  - `payout_status_viewed`.

- Leaderboards & social:
  - `leaderboard_viewed` with period (all‑time, weekly, monthly).  
  - `friend_added`, `friend_request_sent`, `friend_request_responded`.  
  - `group_joined`, `group_created`.

- Communication & voice:
  - `communication_stage_viewed`.  
  - `quick_chat_message_sent`.  
  - `custom_message_sent`.  
  - `voice_room_joined`, `voice_room_left`.

## Implementation Details

Describe:

- A central analytics module:
  - Exporting functions like `track(eventName, properties)`.  
  - Avoiding repeated string literals across the app.  
  - Optionally batching events and handling failures.

- How to:
  - Integrate analytics calls into screen lifecycle events (viewed) and key actions.  
  - Respect user consent and opt‑out preferences.

## Privacy & Compliance

Ensure:

- No raw emails or sensitive identifiers are sent in analytics events unless required and explicitly allowed.  
- Use anonymous or hashed identifiers where possible.  
- Follow platform and regional regulations (GDPR, etc.) with consent flows if needed.

## Deliverables

From this prompt, generate:

1. A mobile analytics event dictionary (names, properties, and usage).  
2. A shared analytics module structure for React Native.  
3. Examples of where to hook analytics in core flows (auth, quiz, wallet, social, voice).  
4. Guidance for mapping client events into admin reporting and AI insight prompts.  
5. Privacy‑aware best practices around what data is and is not tracked.

