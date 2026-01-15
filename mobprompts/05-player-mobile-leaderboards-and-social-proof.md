# Player Quiz App – Mobile Leaderboards & Social Proof Prompt

Use this prompt in MobPrompts to generate the **leaderboard and social proof module** for the player‑facing React Native quiz app, integrated with `/api/app/...` backend and shared schema.

---

You are an expert **product and mobile UI engineer** designing the **Leaderboards** and basic **social proof** features that:

- Motivate players through rankings and competition.  
- Reflect coins and earnings consistently with backend data.  
- Prepare the ground for friends/groups features.

## Context

Relevant data and APIs:

- `profiles`:
  - `username`, `lifetime_earned_coins`, `is_blocked`.  
- `user_quiz_sessions`: used for counts of quizzes played.  
- Leaderboard logic exposed via:
  - `GET /api/app/leaderboard?period=...&limit=...`.

Assume:

- Leaderboard can rank users by:
  - `lifetime_earned_coins` for all‑time.  
  - Time‑filtered earnings or coins for weekly/monthly periods.  
- Backend may optionally return the current user’s rank outside top N.

## Tech Stack

- React Native (TypeScript) within the Leaderboard tab stack.  
- React Query (or similar) for `GET /api/app/leaderboard`.  
- UI components for tabs/segmented controls and ranking lists.

## Screens & Flows

### 1. Leaderboard Overview

- **LeaderboardScreen**
  - Tabs or segmented control for:
    - All‑time.  
    - Weekly.  
    - Monthly.
  - For the selected period:
    - Calls `GET /api/app/leaderboard?period=...&limit=...`.  
  - Shows list entries:
    - Rank.  
    - Username.  
    - Coins/earnings used for ranking.  
    - Quizzes played (derived from `user_quiz_sessions` when provided).  
  - Highlight the current user:
    - If in top N, visually emphasize their row.  
    - If not, show a “Your Position” card with rank and stats, even if outside list.

### 2. Player Detail (Optional)

- Optional **PlayerStatsScreen**
  - When tapping a leaderboard row:
    - Show limited public stats (not sensitive data).  
    - For example:
      - Username.  
      - Total quizzes played.  
      - Lifetime coins earned.  
    - Do not expose email or private fields.

### 3. Social Proof Elements in Other Screens

Describe how to reuse simplified leaderboard data to enhance:

- **HomeScreen**
  - Show small banners like:
    - “Top players this week” with top 3.  
    - “Your rank: #X this week”.

- **ProfileScreen**
  - Show the current user’s rank in relevant periods.  
  - Provide a shortcut link to Leaderboard tab.

## UX & Performance

Ensure:

- Leaderboard lists handle:
  - Loading states with skeletons/placeholders.  
  - Pull‑to‑refresh behavior.  
  - Pagination if needed.

- Visual design:
  - Clear distinction for top 3 ranks (medals, colors).  
  - Current user always easy to find.  
  - Indicate that the leaderboard is based on coins/earnings, not just quiz count.

## Error Handling & Edge Cases

Define behavior when:

- `GET /api/app/leaderboard` fails:
  - Show retry and fallback messaging.  
  - Do not break the rest of the app.  
- User is blocked:
  - Backend may exclude them or return them; respect backend response.  
- No data for a period:
  - Show empty state (“No rankings yet for this period”).

## Deliverables

From this prompt, generate:

1. A React Native design for Leaderboard tab and any related screens.  
2. Interaction patterns for switching periods and refreshing data.  
3. Mapping from leaderboard API response to UI elements and user rank display.  
4. UX guidelines for integrating social proof snippets into Home and Profile screens.  
5. Error and empty‑state patterns that keep the experience polished even without data.

