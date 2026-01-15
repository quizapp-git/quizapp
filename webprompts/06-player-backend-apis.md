# Player Quiz App – Backend API Prompt

Use this prompt in WebPrompts to generate the **player‑facing backend APIs** that the quiz apps will call. These APIs reuse the same Supabase schema and infrastructure already used by the admin portal.

---

You are implementing **player‑side APIs** under `/api/app/...` that:

- Serve quizzes and questions to users.  
- Record quiz sessions and answers.  
- Track AdMob ad impressions (1 per question, up to 10 per session).  
- Manage coins, earnings, and payout requests.  
- Expose user‑side views of leaderboards and wallet data.

Admin‑only APIs already exist under `/api/admin/...`. Do not duplicate admin logic; focus on endpoints that the **mobile quiz apps** will call.

## General Requirements

- Use Supabase server‑side client (service role or secure server context).  
- Authenticate users via Supabase Auth (access token / session from client).  
- Only expose data for the currently authenticated user where appropriate.  
- Do not return admin‑only fields or internal audit data.  
- Respect the schema:
  - `profiles`, `quizzes`, `questions`, `quiz_questions`, `user_quiz_sessions`.
  - `ad_impressions`, `ad_revenue_user_distributions`.
  - `coin_transactions`, `payout_requests`, `app_settings`.

## 1. Auth & Profile APIs

- `GET /api/app/me`
  - Returns:
    - Profile info (username, email).
    - Coin balances (`coins_balance`, `lifetime_earned_coins`).
    - PKR equivalent for current coins (using `coins_to_pkr` from `app_settings`).

- `PUT /api/app/me`
  - Allows updating allowed profile fields (username, avatar URL, etc.).

Assume registration/login flows are handled via Supabase Auth SDK on the client.

## 2. Quiz Discovery & Details

- `GET /api/app/quizzes`
  - Returns **published** quizzes only.
  - Filters:
    - Category.
    - Difficulty.
  - For each quiz:
    - Title, description.
    - Difficulty.
    - Number of questions (`total_questions`, up to 10).
    - Reward model info (e.g. coins per correct answer or per quiz).

- `GET /api/app/quizzes/:id`
  - Returns:
    - Quiz metadata.
    - Ordered list of questions (from `quiz_questions` + `questions`).
    - For each question:
      - `id`, `question_text`, `options`, `difficulty`, `category`.
    - Do not expose `correct_option_index` to the client.

## 3. Quiz Session & Answer Flow

Support the flow:

1. Client fetches quiz questions.  
2. Client starts a quiz session.  
3. User answers a question.  
4. Client shows an AdMob ad after each question and records an ad impression.  
5. After the last question, client submits results to compute coins and score.

APIs:

- `POST /api/app/quizzes/:id/start-session`
  - Creates a `user_quiz_sessions` record:
    - `user_id`, `quiz_id`, `started_at`, `total_questions`.
  - Returns `session_id` to the client.

- `POST /api/app/quizzes/:id/session/:sessionId/answer`
  - Body:
    - `question_id`.
    - `selected_option_index`.
    - `question_index` (1–10).
  - On server:
    - Validate that question belongs to quiz.
    - Compare `selected_option_index` with `correct_option_index`.
    - Track correctness (in memory or a `user_quiz_answers` table if needed).
  - Returns:
    - Whether the answer is correct.
    - Optional per‑question coins (if using per‑question rewards).

- `POST /api/app/quizzes/:id/session/:sessionId/record-ad-impression`
  - Body:
    - `question_index` (1–10).
    - `admob_app_id` or AdMob app identifier.
  - Inserts into `ad_impressions` or updates related table:
    - `user_id`, `quiz_id`, `session_id`, `admob_app_id`, `question_index`, `impressed_at`.
  - Enforce:
    - One impression per question index per session (idempotent check).

- `POST /api/app/quizzes/:id/session/:sessionId/complete`
  - Body:
    - Summary: number of correct answers, total questions (for validation).
  - On server:
    - Validate session exists, belongs to user, and not already completed.
    - Optionally cross‑check answers if stored individually.
    - Compute coins earned for this session based on:
      - Correct answers.
      - Quiz reward settings.
    - Update `user_quiz_sessions` (`completed_at`, `correct_answers`, `coins_earned`).
    - Update `profiles.coins_balance` and `profiles.lifetime_earned_coins`.
    - Insert a `coin_transactions` row of type `'earn'`.
  - Returns:
    - Final score.
    - Coins earned this session.
    - Updated balances.

## 4. Wallet & Earnings APIs

- `GET /api/app/wallet`
  - Returns:
    - Current coin balance.
    - PKR equivalent.
    - Summary of:
      - Total coins from quiz play.
      - Total coins from AdMob revenue share (`ad_revenue_user_distributions`).
      - Total withdrawn.

- `GET /api/app/wallet/transactions`
  - Query params: `page`, `pageSize`, optional `type`, date range.
  - Returns paginated list of `coin_transactions` for the user.

- `GET /api/app/wallet/ad-revenue-shares`
  - Query by date range.
  - Returns user’s entries from `ad_revenue_user_distributions`:
    - Date.
    - AdMob app.
    - Impressions count.
    - PKR share.
    - Coins credited.

## 5. Payout Requests APIs

Business rules:

- User can request a payout when the PKR value of chosen coins is **≥ withdrawal threshold** from `app_settings.withdrawal_threshold` (e.g. 500 PKR).  
- On payout request:
  - Coins are reserved/removed from spendable balance.
  - A `payout_requests` row is created.
  - A `coin_transactions` entry is created with type `'withdrawal'`.

APIs:

- `GET /api/app/payout/settings`
  - Returns:
    - Current `pkr_per_coin`.
    - `min_pkr` threshold.
    - Allowed methods (`bank_transfer`, `easypaisa`, `jazzcash`).

- `POST /api/app/payout/requests`
  - Body:
    - `coins_requested` **or** `pkr_amount` (server will convert to coins).
    - `method` (bank_transfer/easypaisa/jazzcash).
    - `method_details` (validated structure depending on method).
  - On server:
    - Load `coins_to_pkr` and `withdrawal_threshold`.
    - Compute PKR amount and validate `pkr_amount >= min_pkr`.
    - Validate user has enough coins.
    - Create `payout_requests` row with status `pending`.
    - Insert `coin_transactions` with type `'withdrawal'` for reserved coins.
  - Returns:
    - Payout request details and updated balances.

- `GET /api/app/payout/requests`
  - Returns list/history of payout requests for the user (with status).

## 6. Leaderboards APIs

- `GET /api/app/leaderboard`
  - Query params:
    - `period` (`all_time`, `weekly`, `monthly`).
    - `limit` (e.g. 100).
  - Returns:
    - Ranked users by:
      - `lifetime_earned_coins` (or a derived earnings metric) for `all_time`.
      - Time‑filtered earnings for weekly/monthly periods.
    - For each entry:
      - Rank.
      - Username.
      - Coins/earnings used for ranking.
      - Number of quizzes played.
  - Optionally return the current user’s rank even if not in top N.

## 7. Misc & Settings APIs

- `GET /api/app/settings`
  - Returns:
    - `coins_to_pkr` and `withdrawal_threshold`.
    - High‑level explanation flags for client (e.g. show help banners).

- Optionally, `GET /api/app/help`:
  - Returns dynamic FAQ / help content managed by admins.

## Implementation Notes

From this prompt, generate TypeScript handlers or route implementations that:

- Integrate cleanly into a Next.js App Router API or Express API layer.  
- Handle validation and error responses clearly.  
- Use Supabase queries consistent with the schema.  
- Avoid exposing internal data such as `correct_option_index` or admin‑only fields.

Make sure quiz session, ad impressions, and earnings flows enforce:

- Max 10 questions per session.  
- One tracked ad impression per answered question (question_index 1–10).  
- Coins and balances remain consistent with admin‑side views.

