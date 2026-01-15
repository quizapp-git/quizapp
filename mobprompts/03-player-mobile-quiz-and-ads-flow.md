# Player Quiz App – Mobile Quiz Gameplay & Ad Flow Prompt

Use this prompt in MobPrompts to generate the **quiz gameplay flow** and **AdMob integration** for the player‑facing React Native app, aligned with the shared Supabase schema and backend APIs.

---

You are an expert **mobile game and ads integration engineer** implementing the **quiz playing experience** and **post‑question ad flow** in React Native.  
This module:

- Handles quiz discovery, session start, answering questions, and computing results.  
- Integrates the Ads Module to show **one ad after every question**, up to **10 ads per quiz session**.  
- Records ad impressions in the backend using existing tables and `/api/app/...` endpoints.

## Context

Relevant schema and APIs:

- `quizzes`, `questions`, `quiz_questions`, `user_quiz_sessions`.  
- `admob_apps`, `ad_impressions`, `ad_revenue_user_distributions`.  
- `/api/app/quizzes` and `/api/app/quizzes/:id`.  
- `/api/app/quizzes/:id/start-session`.  
- `/api/app/quizzes/:id/session/:sessionId/answer`.  
- `/api/app/quizzes/:id/session/:sessionId/record-ad-impression`.  
- `/api/app/quizzes/:id/session/:sessionId/complete`.  
- Ads configuration and logging under `/api/app/ads/...` when available.

Quiz rules:

- Up to **10 questions** per quiz session.  
- **Exactly one ad** triggered after each answered question, up to **10 ads**.  
- Ad income is shared with users via coins and PKR.

## Tech Stack

- React Native (TypeScript) with React Navigation (Home stack).  
- React Query (or similar) for data fetching.  
- Ads Module with:
  - `AdService` abstraction.  
  - AdMob provider implementation, provider‑agnostic interface.

## Screens & Flows

Design the following screens.

### 1. Home / Quiz Discovery

- **HomeScreen**
  - Uses `GET /api/app/quizzes` to show published quizzes only.  
  - Displays:
    - Title, description.  
    - Difficulty.  
    - Number of questions (up to 10).  
    - Reward summary (coins per correct answer or per quiz).  
  - Filters:
    - Category and difficulty.  
  - Tap on a quiz → navigate to `QuizDetailsScreen`.

- **QuizDetailsScreen**
  - Uses `GET /api/app/quizzes/:id` for metadata.  
  - Shows:
    - Description, difficulty, total questions, time limit (if any).  
    - Estimated coin rewards.  
  - “Start Quiz” button:
    - Calls `POST /api/app/quizzes/:id/start-session` to create `user_quiz_sessions`.  
    - Receives `session_id` and `total_questions`.  
    - Navigates to `QuizPlayScreen` with `quiz_id` and `session_id`.

### 2. Quiz Play with Ads

- **QuizPlayScreen**
  - Inputs: `quiz_id`, `session_id`.  
  - Data:
    - Fetches ordered questions via `GET /api/app/quizzes/:id`.  
    - Does not receive `correct_option_index` on the client.  
  - UI:
    - Shows one question at a time.  
    - Options as tappable buttons.  
    - Progress indicator (e.g. “Question 3 of 10”).

Flow per question:

1. User selects an option.  
2. Call `POST /api/app/quizzes/:id/session/:sessionId/answer` with:
   - `question_id`, `selected_option_index`, `question_index` (1–10).  
3. Backend returns whether the answer is correct and optional per‑question reward info.  
4. Show immediate feedback (correct/incorrect).  
5. Trigger Ads Module to show an **interstitial ad**:
   - Call something like `AdService.showQuizInterstitial(questionIndex, context)`.  
   - Respect `max_ads_per_quiz_session` (10) and `show_ad_after_every_question`.  
   - If ad fails to load or show, gracefully skip it and continue quiz.  
6. Log ad impression:
   - Call `/api/app/quizzes/:id/session/:sessionId/record-ad-impression` or `/api/app/ads/impression`.  
   - Include `question_index`, provider info, and identifiers for `ad_impressions`.
7. Move to next question or finish quiz when the last question is answered.

Constraints:

- Max 10 questions per session.  
- Exactly one ad opportunity per answered question, up to 10.  
- Ads appear **after** answering, never before or between screens arbitrarily.

### 3. Quiz Completion & Results

- After the last question:
  - Call `POST /api/app/quizzes/:id/session/:sessionId/complete` with summary data:
    - Number of correct answers.  
    - Total questions (for validation).  
  - Backend:
    - Validates session belongs to user and is not already completed.  
    - Computes final coins earned based on quiz settings and answers.  
    - Updates `user_quiz_sessions` with `completed_at`, `correct_answers`, `coins_earned`.  
    - Updates `profiles` (`coins_balance`, `lifetime_earned_coins`).  
    - Inserts `coin_transactions` of type `'earn'`.

- **QuizResultScreen**
  - Shows:
    - Score and correct/incorrect count.  
    - Coins earned this session.  
    - Updated coin balance and PKR equivalent.  
  - Actions:
    - “Play Again” (new session for same quiz).  
    - “Back to Home”.

## Ads Module Integration

Describe how the Ads Module plugs into this flow:

- **Configuration**
  - Load ad configuration at app start or when needed via `/api/app/ads/config`.  
  - Determine:
    - Enabled providers, weights, and ad unit IDs.  
    - `ads_enabled`, `max_ads_per_quiz_session`, `show_ad_after_every_question`.

- **AdService**
  - Provides:
    - `showQuizInterstitial(questionIndex, context)`.  
  - Handles:
    - Preloading interstitials.  
    - Showing ads and resolving a result object.  
    - Failing gracefully on load/show errors.

- **Impression Logging**
  - After each ad show attempt:
    - Log impressions via `/api/app/ads/impression` or quiz session logging endpoint.  
    - Include provider, placement (`QUIZ_AFTER_QUESTION`), `quiz_id`, `session_id`, `question_index`.

Ensure design is compatible with the backend Ads & Revenue prompts so impressions can be mapped to `ad_revenue_user_distributions`.

## Error Handling & Edge Cases

Define behavior when:

- `GET /api/app/quizzes` fails:
  - Show retry and fallback states on Home.  
- Starting a session fails:
  - Prevent entering `QuizPlayScreen` and show clear message.  
- Answer or complete call fails mid‑quiz:
  - Provide retry, or allow graceful exit from session with partial progress rules defined.  
- Ads repeatedly fail to load:
  - Do not block quiz; log events and continue game experience.

## Deliverables

From this prompt, generate:

1. A detailed React Native design for `HomeScreen`, `QuizDetailsScreen`, `QuizPlayScreen`, and `QuizResultScreen`.  
2. A step‑by‑step flow description for question answering and post‑answer Ads.  
3. Example interaction patterns with `/api/app/quizzes/...` endpoints.  
4. Ads integration notes showing how to enforce 10 questions and 10 ads max per session.  
5. Error handling and UX patterns so gameplay remains smooth even when ads or network calls fail.

