# Admin Portal – Backend API Prompt

Use this prompt in WebPrompts to generate the **backend API layer** for the admin‑only portal, using the Supabase schema from the previous prompt.

These APIs must respect the admin roles defined in the **Admin Portal – Global System Prompt** (Super Admin, Super Manager, Super Viewer) and must never be callable by regular player accounts.

---

You are implementing **admin‑only backend APIs** for a quiz + AdMob revenue‑sharing platform.

- Stack: **PERN + Supabase**, deployed on **Vercel**.  
- Admin portal only (no player UI here).  
- All endpoints live under `/api/admin/...` and are protected so that only admin accounts with roles **Super Admin**, **Super Manager**, or **Super Viewer** can call them (never regular player accounts).

## General Requirements

- Use Supabase server‑side client (service role or secure server context) to query PostgreSQL.  
- For every request:
  - Validate Supabase session (from cookies or headers).
  - Confirm that the user is one of the allowed admin roles (via `admin_profiles` or auth metadata).
  - Return consistent JSON responses with clear error codes/messages.
- Log sensitive actions to `audit_logs`.

Group APIs by domain: Question Bank, AI generation, Quizzes, Users & Leaderboards, Earnings & Payouts, AdMob & Revenue Sharing, Settings & Audit Logs.

## 1. Authentication & Admin Context

Implement helpers/middleware:

- `getAdminContext(req)`:
  - Validates Supabase session.
  - Fetches corresponding `admin_profiles` row.
  - Throws or returns error if user is not an admin.

Use this helper across all `/api/admin/*` handlers.

## 2. Question Bank APIs

Routes (examples, adjust path style to framework):

- `GET /api/admin/questions`
  - Query params: `search`, `category`, `difficulty`, `tag`, `is_active`, `page`, `pageSize`.
  - Returns paginated results plus total count.

- `GET /api/admin/questions/:id`

- `POST /api/admin/questions`
  - Body: `question_text`, `options`, `correct_option_index`, `category`, `tags`, `difficulty`, `is_active`.
  - Validations:
    - `options` length ≥ 2.
    - `correct_option_index` within range.
  - Sets `created_by_admin_id` from current admin.
  - Creates an `audit_logs` entry (`CREATE_QUESTION`).

- `PUT /api/admin/questions/:id`
  - Updates question fields and `updated_at`.
  - Logs `UPDATE_QUESTION` in `audit_logs`.

- `DELETE /api/admin/questions/:id`
  - Soft delete: set `is_active = false`.
  - Logs `DELETE_QUESTION`.

## 3. AI‑Assisted Question Generation APIs

- `POST /api/admin/ai/generate-questions`
  - Body: `topic`, `difficulty`, `count`, `tags`.
  - Server‑side call to an LLM (e.g. OpenAI) to generate MCQs.
  - Validates structure: `question_text`, `options`, `correct_option_index`, `category`, `tags`, `difficulty`.
  - Returns generated questions for admin preview; does not insert yet.

- `POST /api/admin/ai/save-generated-questions`
  - Body: list of selected questions + their fields.
  - Bulk inserts valid questions into `questions`.
  - Sets `created_by_admin_id`.
  - Logs a bulk create action in `audit_logs`.

## 4. Quiz Management APIs

- `GET /api/admin/quizzes`
  - Filters: `status`, `difficulty`, creation date range.

- `GET /api/admin/quizzes/:id`
  - Returns quiz metadata plus associated `quiz_questions`.

- `POST /api/admin/quizzes`
  - Body: metadata and initial list of question IDs.
  - Validates minimum number of questions (e.g. 5) and up to 10 questions if that is the gameplay design.

- `PUT /api/admin/quizzes/:id`
  - Updates metadata and question list (quiz_questions with sequence).
  - Ensures `total_questions` matches associated questions.

- `POST /api/admin/quizzes/:id/publish`
  - Sets status to `published` with necessary validation.

- `POST /api/admin/quizzes/:id/archive`
  - Sets status to `archived`.

Log quiz creation, updates, and status changes in `audit_logs`.

## 5. Users & Leaderboard APIs

- `GET /api/admin/users`
  - Filters: search (email/username), blocked state, min coins, joined date range.
  - Returns summary info including:
    - `coins_balance`, `lifetime_earned_coins`, number of quizzes played.

- `GET /api/admin/users/:id`
  - Returns profile info, recent `user_quiz_sessions`, and recent `coin_transactions`.

- `POST /api/admin/users/:id/block`
  - Sets `is_blocked = true`.
  - Logs `BLOCK_USER`.

- `POST /api/admin/users/:id/unblock`
  - Sets `is_blocked = false`.
  - Logs `UNBLOCK_USER`.

- `POST /api/admin/users/:id/adjust-coins`
  - Body: `amount_coins` (positive or negative), `reason`.
  - Updates `profiles.coins_balance` and `lifetime_earned_coins` accordingly.
  - Inserts a `coin_transactions` record with type `'adjustment'`.
  - Logs `ADJUST_COINS`.

- `GET /api/admin/leaderboard`
  - Query params: `period` (`all_time`, `weekly`, `monthly`), `limit`.
  - Uses `user_quiz_sessions` and/or `lifetime_earned_coins` to rank users.

## 6. Earnings & Payouts APIs

Business rules:

- Users earn **gold coins** through playing quizzes and via **AdMob revenue share**.  
- Each coin has a **PKR value** defined in `app_settings.coins_to_pkr`.  
- Users can request withdrawals if the PKR value of their selected coins is at or above the **threshold** defined in `withdrawal_threshold` (minimum 500 PKR).

APIs:

- `GET /api/admin/earnings/summary`
  - Returns:
    - Total coins in circulation.
    - Total PKR liability (coins_balance × current pkr_per_coin).
    - Total payouts paid.

- `GET /api/admin/payout-requests`
  - Filters: `status`, `method`, date range, min/max `pkr_amount`.

- `GET /api/admin/payout-requests/:id`

- `POST /api/admin/payout-requests/:id/approve`
  - Verify that:
    - Request is `pending`.
    - User’s reserved/withdrawal coins are valid.
  - Set status to `approved`, set `processed_by_admin_id`, update timestamps.
  - Log `APPROVE_PAYOUT`.

- `POST /api/admin/payout-requests/:id/reject`
  - Optionally refund coins via `coin_transactions`.
  - Set status to `rejected`.
  - Log `REJECT_PAYOUT`.

- `POST /api/admin/payout-requests/:id/mark-paid`
  - Set status from `approved` to `paid`.
  - Set `processed_at` and `processed_by_admin_id`.
  - Log `MARK_PAYOUT_PAID`.

## 7. AdMob & Revenue‑Sharing APIs

These APIs let admins manage quiz apps, view AdMob data, and control revenue sharing.

- `GET /api/admin/admob/apps`
  - List registered AdMob‑connected quiz apps.

- `POST /api/admin/admob/apps`
  - Create a new entry in `admob_apps` with name, platform, AdMob app id, and ad unit ids.

- `PUT /api/admin/admob/apps/:id`
  - Update details, log `UPDATE_ADMOB_APP`.

- `GET /api/admin/admob/revenue-snapshots`
  - Filters: app id, date range.
  - Returns aggregated data from `ad_revenue_snapshots`.

- `POST /api/admin/admob/sync-revenue`
  - Server‑side task to fetch data from AdMob API and populate `ad_revenue_snapshots`.
  - Should be admin‑only and protected; may be triggered manually or scheduled.

- `GET /api/admin/admob/revenue-share/config`
  - Returns `app_settings.ad_revenue_share` and `coins_to_pkr`.

- `PUT /api/admin/admob/revenue-share/config`
  - Updates revenue share percentages and logs `UPDATE_REVENUE_SHARE_CONFIG`.

- `POST /api/admin/admob/revenue-share/distribute`
  - For a given date range and app:
    - Reads `ad_revenue_snapshots` and `ad_impressions` or `user_quiz_sessions`.
    - Computes each user’s share of impressions (users see one ad after each question, up to 10 per session).
    - Converts user share PKR → coins using `coins_to_pkr`.
    - Creates `ad_revenue_shares` and `ad_revenue_user_distributions`.
    - Inserts corresponding `coin_transactions` of type `'ad_revenue_share'`.
    - Logs `DISTRIBUTE_AD_REVENUE`.

## 8. Settings & Audit Log APIs

- `GET /api/admin/settings`
  - Returns:
    - `coins_to_pkr`.
    - `withdrawal_threshold` (min_pkr).
    - `ad_revenue_share`.

- `PUT /api/admin/settings/coins-to-pkr`
  - Updates `pkr_per_coin`.
  - Logs `UPDATE_SETTING_COINS_TO_PKR`.

- `PUT /api/admin/settings/withdrawal-threshold`
  - Updates `min_pkr`, with server‑side guard that it cannot go below 500 without explicit override flag.
  - Logs `UPDATE_SETTING_WITHDRAWAL_THRESHOLD`.

- `PUT /api/admin/settings/ad-revenue-share`
  - Updates `user_share_percent` and `platform_share_percent`.
  - Logs `UPDATE_SETTING_AD_REVENUE_SHARE`.

- `GET /api/admin/audit-logs`
  - Filters: date range, admin_id, action, target_type.

Provide TypeScript handler code (or clear pseudo‑code) that fits naturally into a Next.js (App Router) or Express‑based backend, focusing on input validation, error responses, and consistent use of the Supabase client.
