# Player Quiz App – Mobile Offline & Resilience Prompt

Use this prompt in MobPrompts to generate the **offline, caching, and resilience strategy** for the player‑facing React Native quiz app.

---

You are an expert **mobile performance and resilience engineer** designing how the app behaves when:

- Network connectivity is slow, flaky, or temporarily unavailable.  
- Backend APIs are down or responding with errors.  
- The user is in the middle of a quiz session when connectivity issues occur.

## Context

The app relies heavily on:

- `/api/app/quizzes` and quiz session endpoints.  
- `/api/app/wallet`, `/payout/...`, and `/leaderboard`.  
- `/api/app/ads/...` and ad impression logging.  
- Communication policy, chat, and voice (less critical but still important).

You must ensure:

- Quiz sessions remain as robust as possible.  
- No inconsistent or duplicate coin rewards and impressions.  
- Users receive clear feedback about network issues.

## Tech & Integration

- React Native (TypeScript).  
- Data layer with React Query (or similar) plus:
  - Persistent cache (AsyncStorage or equivalent).  
  - Retry and backoff strategies.  
- Optional local queue for:
  - Ad impression logs.  
  - Non‑critical analytics events.

## Design Areas

### 1. Network Awareness

- Implement a network status hook:
  - Detect online/offline transitions.  
  - Expose status to screens (e.g. banner “You’re offline”).  
  - Integrate with OS network APIs or libraries like `@react-native-community/netinfo`.

### 2. Quiz Session Resilience

- When fetching quizzes:
  - Use cached quiz list for Home when offline, if available.  
  - Mark quizzes that require online connectivity to start.

- During a quiz session:
  - If `/answer` call fails:
    - Show clear message.  
    - Allow retry without losing user choice.  
  - If `/complete` fails:
    - Keep local record of pending completion.  
    - Retry when back online.  
    - Ensure server‑side logic stays idempotent to avoid duplicate coin rewards.

### 3. Ad Logging Resilience

- Ad impressions:
  - If impression logging fails while offline:
    - Queue impression events locally with timestamps.  
    - Sync them when online, respecting backend idempotency (e.g. only one impression per question/session).

- If ad load fails due to network:
  - Do not retry aggressively; continue quiz smoothly.  
  - Optionally log a non‑blocking error event for diagnostics.

### 4. Wallet & History

- Wallet:
  - Cache the last known wallet summary for quick display.  
  - Mark data as potentially stale when offline.  

- Transactions and payout history:
  - Allow viewing cached data.  
  - Indicate offline state and disable actions that must be online (e.g. new payout request).

### 5. Leaderboards & Social

- Leaderboards:
  - Show last successfully fetched leaderboard when offline.  
  - Indicate that ranks may be outdated.  

- Friends/groups/chat/voice:
  - Detect offline and:
    - Disable send actions for chat.  
    - Prevent joining voice rooms.  
    - Explain that connectivity is required for real‑time features.

## Error Handling & UX

Ensure:

- Clear, non‑technical messages when requests fail.  
- Consistent patterns for:
  - Retry buttons.  
  - Disabled actions with tooltips or inline explanations.  
  - Offline banners at the top of key screens.

Design:

- Reasonable retry limits and backoff to avoid hammering backend.  
- Safe handling of partial operations, especially around quiz completion and payouts.

## Deliverables

From this prompt, generate:

1. A network awareness and offline handling strategy for the entire app.  
2. Detailed behaviors for quiz sessions under poor connectivity.  
3. Caching and sync strategies for wallet, leaderboards, and non‑critical data.  
4. Ad logging resilience patterns that respect backend idempotency.  
5. UX guidelines for communicating offline status and recovery options to users.

