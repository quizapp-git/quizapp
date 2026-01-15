# Player Quiz App – Mobile Onboarding & Growth Prompt

Use this prompt in MobPrompts to generate the **onboarding, education, and growth loops** for the player‑facing React Native quiz app, aligned with the Supabase backend and existing business rules.

---

You are an expert **product‑led growth and mobile UX engineer** designing how new and returning players:

- Learn how the quiz + ads + coins + PKR + payouts system works.  
- Understand the value of playing quizzes and viewing ads.  
- Are guided into deeper features like leaderboards, friends, groups, and voice chat.  
- Are encouraged to return with healthy, non‑spammy engagement mechanics.

## Context

The app:

- Uses a shared Supabase schema and `/api/app/...` backend.  
- Shows **one ad after each question**, up to **10 questions/ads per session**.  
- Rewards users with coins and PKR, with payouts controlled by `app_settings`.  
- Unlocks communication stages (quick chat, custom text, voice) based on ads viewed and other rules.  
- Has modules for wallet, leaderboards, friends, groups, ads, and communication policy.

You must design onboarding and growth flows that:

- Educate without overwhelming.  
- Are consistent with admin‑side analytics and reporting.  
- Respect user safety and regulatory constraints.

## Tech & Integration

- React Native (TypeScript) with React Navigation.  
- Optional onboarding flow that runs before or after sign‑up, depending on product decision.  
- Backend integration:
  - `/api/app/settings` for global explanations flags and feature availability.  
  - Optional `/api/app/experiments` or config endpoints for A/B tests (if defined).  
  - Analytics tracking events that map to admin reporting prompts.

## Screens & Flows

### 1. First‑Time Onboarding

- **OnboardingCarouselScreen**
  - A small sequence of screens/pages that explain:
    - How quizzes work (up to 10 questions per session).  
    - Ad policy (1 ad after each question, up to 10).  
    - How coins and PKR work, including withdrawal threshold.  
    - Basic idea of communication stages (quick chat → text → voice).  
  - Clear “Continue” or “Get Started” button to reach Sign Up or Home.

- Decide where onboarding fits:
  - Before registration (to market the value).  
  - After registration but before first quiz (to ensure understanding).  
  - Ability to skip, with a way to revisit later (e.g. from Help).

### 2. New User Guidance

- **FirstSessionGuide**
  - On the first quiz session:
    - Lightweight tooltips or banners:
      - “You’ll see an ad after each question (max 10).”  
      - “You earn coins for correct answers and shared ad revenue.”  
    - Highlight wallet and leaderboard entry points after finishing first quiz.

- **Progress Nudges**
  - Simple indicators of:
    - How many quizzes played.  
    - How close they are to unlocking next communication stage.  
  - Avoid pushy or dark patterns; keep it informative and optional.

### 3. Return User Engagement

- **HomeScreen Enhancements**
  - “Welcome back” section:  
    - Show streaks or days active, if backend supports it.  
    - Show coins earned since last visit.  
  - Recommendations:
    - Quizzes to continue or replay.  
    - New or trending quizzes from `/api/app/quizzes`.

- **Notifications & Reminders (Conceptual)**
  - Design in‑app reminder cards for:
    - Pending payout eligible but not requested.  
    - Communication stage close to upgrade.  
    - New group invites or friend requests.  
  - Mention how push notifications can be modelled (exact push implementation can be in a dedicated notifications prompt).

### 4. Growth Loops

Describe potential growth mechanisms (without implementing spammy patterns):

- **Referrals (Conceptual)**
  - A simple referral screen:
    - Shows user code or deep link.  
    - Explains referral rewards as defined by backend rules (if any).  
  - Backend endpoints for redeeming referral codes can be assumed or described.

- **Social Sharing**
  - Post‑quiz “Share your score” call‑to‑action with system share dialogs.  
  - Ensure no sensitive data is shared; just score and general app link.

## Analytics & Measurement

Define key events to track for onboarding and growth:

- Onboarding events:
  - Viewed page 1/2/3, completed onboarding, skipped onboarding.  
- Quiz adoption events:
  - First quiz started, first quiz completed, first payout requested.  
- Growth events:
  - Referral shared, referral redeemed, friend added, group joined.

Ensure:

- Events can be mapped into existing admin reporting prompts without exposing PII.  
- Event names and properties are consistent and easy to query.

## UX & Safety

Ensure:

- Onboarding is skippable but easy to revisit.  
- Growth prompts never misrepresent earnings potential or payouts.  
- Any rewards for referrals or engagement are consistent with local laws and platform policies.

## Deliverables

From this prompt, generate:

1. A React Native onboarding flow design (screens, order, skip/resume behavior).  
2. New‑user and returning‑user guidance patterns integrated into Home, Wallet, and Profile.  
3. Growth loop concepts (referrals, social share) consistent with the backend and admin reporting.  
4. Analytics events to measure onboarding effectiveness and growth without storing sensitive data.  
5. Clear UX guidelines that keep onboarding honest, transparent, and non‑manipulative.

