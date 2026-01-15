# Player Quiz App – Mobile Communication Policy & Unlockable Chat/Voice UX Prompt

Use this prompt in MobPrompts to generate the **UX for the communication policy** that controls when players unlock quick chat, custom text chat, and voice chat in the React Native app, based on ads viewed and other rules.

---

You are an expert **product and UX engineer** implementing the **communication policy layer** in the player app.  
This module does not build the underlying chat or voice transport; instead it:

- Reads communication policy and status from the backend.  
- Shows what communication features are unlocked or locked.  
- Explains how players can unlock more advanced communication (e.g. by watching ads).  
- Coordinates with existing chat and voice modules to enable/disable UI capabilities.

## Context

From the Chat & Voice Policy prompt:

- There is a policy that defines **communication stages** based on:
  - Number of ads viewed (`ad_impressions` and related aggregate stats).  
  - Other possible criteria (account age, behavior flags, etc.).  
- Stages might be:
  - Stage 1: Only predefined quick chat messages.  
  - Stage 2: Custom text chat unlocked.  
  - Stage 3: Voice chat unlocked.

- Backend exposes:
  - Tables or views for per‑user communication status.  
  - `/api/app/...` endpoints that return:
    - Current stage.  
    - Counters (ads viewed, quizzes played, etc.).  
    - Thresholds for next stage.

This module must integrate with:

- Quick Chat UI.  
- Friends and groups chat.  
- Voice room UI.

## Tech Stack

- React Native (TypeScript).  
- React Query for communication status endpoint.  
- A small communication context/provider to share status across the app.

## UX Elements & Flows

### 1. Communication Status Surface

- In **ProfileScreen**:
  - Show:
    - Current communication stage (e.g. “Stage 1 – Quick Chat Only”).  
    - Summary of what is available (quick chat/custom chat/voice).  
    - Progress to next stage:
      - Ads viewed so far vs threshold (or other metrics the backend exposes).
  - Provide a “Learn more” link to Help/FAQ.

- In **Friends/Quick Chat** screens:
  - If user is not allowed custom text:
    - Hide or disable text input.  
    - Show a message about quick chat only and how to unlock custom chat.

- In **Groups & Voice** screens:
  - If user is not allowed voice:
    - Hide or disable “Join Voice” or “Create Voice Room” actions.  
    - Show information about required stage and how to progress.

### 2. Progress & Incentives

- Design clear, non‑spammy indicators that:
  - Encourage users to play quizzes and watch ads (as part of normal gameplay) to unlock features.  
  - Show exact or approximate progress, as provided by backend:
    - For example: “X of Y ads viewed to unlock custom chat”.

- Ensure:
  - All progress and thresholds are computed server‑side; client just displays them.  
  - No arbitrary client‑side counters that could desync or be manipulated.

### 3. Policy‑Driven UI States

Define how chat/voice modules consume communication status:

- Provide a communication context with:
  - `stage`.  
  - `canUseQuickChat`.  
  - `canUseCustomText`.  
  - `canUseVoice`.  
  - Progress details and thresholds.

- UI in chat and voice modules uses these flags to:
  - Enable or disable controls.  
  - Show locked states and messaging.

### 4. Help & Education

- **HelpScreen** additions:
  - Explain:
    - Why communication is staged (safety, abuse prevention, reward for engagement).  
    - How ads and quiz play influence unlocking.  
    - How coins and revenue sharing are separate from communication stages but all rely on ad impressions.

## Error Handling & Edge Cases

Define behavior when:

- Communication status endpoint fails:
  - Default to the safest, most restrictive stage.  
  - Show generic messaging until data can be loaded.  
- Backend changes thresholds or policy:
  - UI automatically reflects new stage and thresholds from next response.  
  - Do not cache outdated thresholds for long durations.

## Deliverables

From this prompt, generate:

1. A React Native design for surfacing communication stages in Profile, Chat, and Voice UI.  
2. A communication context and data flow from backend status endpoint to UI flags.  
3. UX patterns for locked/unlocked states and progress messaging.  
4. Integration notes showing how this policy layer coordinates with Friends/Quick Chat and Groups/Voice prompts.  
5. Safety‑first defaults when policy data is missing or fails to load.

