# Player Quiz App – Chat & Voice Access Policy Based on Ads Viewed

Use this prompt in WebPrompts to design and implement a **policy that unlocks chat and voice features based on how many ads a player has viewed** in the quiz app.

---

You are extending the **player-facing quiz app** (React Native + Supabase + PERN backend) to tie **communication features (text chat and voice chat)** to **AdMob ad impressions** per user.

Also see the **AdMob & Mobile Ad Providers Integration Module** prompt for the dedicated Ads Module that provides the ad impressions and configuration this policy is built on.

## Context

- Existing system:
  - Admin portal (PERN + Supabase + Vercel) manages quizzes, AdMob settings, revenue sharing, coins, payouts, leaderboards, etc.
  - Player app (React Native) already supports:
    - Quiz gameplay with AdMob (1 ad after each question, up to 10 per quiz session).
    - Wallet, coins, payout requests.
    - Friends and predefined quick chat (no free text) as per existing prompts.
    - Optional voice chat and multiplayer rooms as per voice chat prompt.
  - Backend tracks ad impressions in tables like `ad_impressions` and aggregates them for revenue sharing.
- Business requirement:
  - Access to chat and voice capabilities should **depend on how many ads the user has viewed**.

Assume the backend can compute a **per-user cumulative ad impressions count** and expose it via APIs or materialized views.

## Policy Goals

Define and enforce a **three-stage communication access policy** based on the **total number of ads viewed** by a player (cumulative across sessions):

1. Stage 1 – Predefined text only
   - For players who have viewed up to a low ad count threshold (default: 0–99 ads or until they first cross 100 ads).
   - Allowed:
     - Only predefined quick chat messages (from `quick_chat_messages`) in games and rooms.
   - Not allowed:
     - Free-text/custom chat messages.
     - Voice chat in any rooms.
2. Stage 2 – Custom text chat unlocked
   - For players who have viewed a medium ad count threshold (default: from 100 or 200 ads up to below 500 ads).
   - Allowed:
     - Predefined quick chat messages.
     - Free-text/custom messages in chat sections (friends chat, room chat, game chat), subject to moderation and filters.
   - Not allowed:
     - Voice chat in rooms.
3. Stage 3 – Voice chat unlocked
   - For players who have viewed a high ad count threshold (default: 500+ ads).
   - Allowed:
     - Predefined quick chat messages.
     - Free-text/custom chat messages.
     - Join and speak in voice rooms/voice channels.

Design the system so that:

- Thresholds are **configurable** (via settings table or environment variables), with recommended defaults:
  - `TEXT_PRESET_ONLY_MAX_ADS` (e.g. 0–99).
  - `TEXT_CUSTOM_MIN_ADS` (e.g. 100 or 200).
  - `VOICE_CHAT_MIN_ADS` (e.g. 500).
- The policy can be **changed without redeploying mobile apps**, by reading thresholds and eligibility from backend APIs.

## Data Model and Eligibility Computation

Design or extend data structures to compute eligibility:

1. Ad impressions aggregation:
   - Ensure you can efficiently compute **total ads viewed per user**:
     - Aggregate from `ad_impressions` table, or
     - Maintain a `user_ad_stats` table/materialized view:
       - `user_id`.
       - `total_ads_viewed` (cumulative count).
       - Optional:
         - `last_ad_viewed_at`.
         - `ads_viewed_last_7_days`.
   - Consider background jobs or triggers to keep aggregates up to date.
2. Communication access state:
   - Option A: Compute eligibility on the fly:
     - Given `total_ads_viewed`, derive `communication_stage`:
       - `STAGE_PRESET_ONLY`, `STAGE_CUSTOM_TEXT`, `STAGE_VOICE_ENABLED`.
   - Option B: Store a derived column in a dedicated table:
     - `user_communication_state`:
       - `user_id` pk references `profiles(id)`.
       - `total_ads_viewed`.
       - `communication_stage` enum.
       - `updated_at`.
3. Configuration:
   - Add a configuration source (e.g. `app_settings` or `communication_policy_settings`) with fields:
     - `text_preset_only_max_ads`.
     - `text_custom_min_ads`.
     - `voice_chat_min_ads`.
   - Make sure the admin portal can update these values.

Clearly define how `communication_stage` is calculated from `total_ads_viewed` and the configured thresholds.

## Backend Policy Enforcement

Extend backend APIs and middleware so that chat and voice features **enforce** the policy:

1. Eligibility helper:
   - Implement a shared function/module:
     - Input: `user_id`.
     - Looks up `total_ads_viewed` and thresholds.
     - Returns `communication_stage` and booleans:
       - `can_use_preset_quick_chat`.
       - `can_use_custom_text_chat`.
       - `can_use_voice_chat`.
2. Friends and chat APIs:
   - For quick chat APIs (`/api/app/quick-chat/...`):
     - Allow only if `can_use_preset_quick_chat` is true.
     - This should be true for all stages (1–3).
   - For any custom text chat APIs (e.g. `/api/app/chat/...` or extended friends chat):
     - Allow send message only if `can_use_custom_text_chat` is true.
     - If not, return a structured error like `COMMUNICATION_STAGE_INSUFFICIENT`.
3. Voice chat APIs (`/api/app/voice/...`):
   - `POST /api/app/voice/create-room` and `POST /api/app/voice/join-room`:
     - Check `can_use_voice_chat` before:
       - Creating a voice room.
       - Joining a voice channel.
     - If stage is below voice threshold:
       - Return error with code and message indicating voice requires more ads viewed.
4. Audit and logging:
   - Optionally log when users:
     - Cross thresholds (e.g. when they move from Stage 1 → Stage 2 → Stage 3).
     - Are blocked from actions due to insufficient communication stage.

Describe how these checks integrate into existing controllers/handlers and how they should be tested.

## Player-Facing API Design

Expose the player’s communication stage and progression via `/api/app/...` endpoints so the app can render correct UI:

1. Communication status endpoint:
   - `GET /api/app/communication/status`
   - Returns:
     - `total_ads_viewed`.
     - `communication_stage` (`PRESET_ONLY`, `CUSTOM_TEXT`, `VOICE_ENABLED`).
     - Boolean flags:
       - `can_use_preset_quick_chat`.
       - `can_use_custom_text_chat`.
       - `can_use_voice_chat`.
     - Thresholds:
       - `text_preset_only_max_ads`.
       - `text_custom_min_ads`.
       - `voice_chat_min_ads`.
     - Progress info:
       - `ads_needed_for_custom_text`.
       - `ads_needed_for_voice_chat`.
2. Integration into profile:
   - Extend `GET /api/app/profile/me` (if appropriate) to include:
     - Communication stage and total ads viewed.
     - Progress to next stage.
3. Rate limiting and caching:
   - Design responses to be cacheable or memoized per user to avoid recalculating on every request.

Define response shapes and error codes clearly.

## Mobile App UX and Behavior

Update the React Native app to **respect the policy** and guide users through stages:

1. Visibility and gating:
   - In chat UI:
     - If user is Stage 1 (preset only):
       - Show predefined quick chat panel/buttons.
       - Hide or disable free-text input boxes.
     - If user is Stage 2 or 3:
       - Show both quick chat and a text input box.
   - In voice-related UI (voice rooms, join voice button):
     - Only show/join voice controls if `can_use_voice_chat` is true.
     - Otherwise:
       - Show a lock state with information about required ads.
2. Progress messaging:
   - On profile or a dedicated “Communication Level” card:
     - Display:
       - Current stage (e.g. “Stage 1: Quick Chat Only”).
       - Total ads viewed.
       - How many more ads are needed to unlock:
         - Custom text chat.
         - Voice chat.
   - Optionally show progress bars or badges when a stage is unlocked.
3. Edge cases:
   - When thresholds change on the server:
     - Ensure the app reacts gracefully when a user’s stage moves up or down after fetching latest status.
   - When network is offline:
     - Fall back to last known communication status, with sensible defaults.

Describe how hooks or context (e.g. `useCommunicationStatus()`) should fetch and update this information in the app.

## Admin Portal and Policy Management

Define how admins configure and monitor this policy:

1. Configuration UI:
   - In the admin portal, add a section for **Communication & Ads Policy**:
     - Fields to set:
       - `text_preset_only_max_ads`.
       - `text_custom_min_ads`.
       - `voice_chat_min_ads`.
     - Validation to ensure thresholds are consistent (e.g. preset max < custom min ≤ voice min).
2. Monitoring:
   - Admin reports/charts to see:
     - Distribution of users across stages.
     - Correlation between communication stages and:
       - Retention.
       - Revenue.
       - Abuse reports (if any).
3. Overrides:
   - Optional per-user overrides:
     - Allow some users to bypass thresholds (e.g. testers, VIPs).
     - Implement a `user_communication_overrides` table:
       - `user_id`.
       - `forced_stage` or `can_use_voice_chat_override`.
       - `expires_at`.

Include recommendations on how to handle policy changes safely in production.

## Safety, Abuse Prevention, and Compliance

Ensure that unlocking more powerful communication features does not increase abuse risk without controls:

- Custom text chat:
  - Integrate with content filters / bad word lists.
  - Provide reporting and blocking tools for users.
  - Optionally rate limit messages per user per minute.
- Voice chat:
  - Respect existing voice chat safety measures (short-lived tokens, moderation tools).
  - Consider region/language-specific disclaimers when voice is enabled.
- Ads fairness:
  - Make sure users cannot artificially inflate `total_ads_viewed` (e.g. by cancelling ads early).
  - Only count fully served impressions recorded by AdMob/backend.

## Deliverables

From this prompt, generate:

1. Database and configuration changes:
   - Aggregation of ad impressions per user.
   - Communication state storage (if used).
   - Policy configuration tables/fields and optional overrides.
2. Backend logic and APIs:
   - Eligibility helper functions and middleware.
   - Enforcement in chat and voice endpoints.
   - `/api/app/communication/status` and any profile extensions.
3. React Native client updates:
   - Hooks/contexts to fetch communication status.
   - UI changes that gate features by stage and show progress.
4. Admin portal updates:
   - Configuration screens for thresholds.
   - Monitoring tools for adoption and abuse.

Design everything so the **ads-based communication policy** is transparent to players, configurable by admins, and safe for the community.
