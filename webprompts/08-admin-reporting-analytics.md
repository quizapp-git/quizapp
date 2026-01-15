# Admin Portal – Reporting & Analytics Prompt

Use this prompt in WebPrompts to generate **advanced reporting & analytics capabilities** inside the admin portal for the quiz + AdMob revenue‑sharing ecosystem.

All reporting features assume the admin access model defined in the **Admin Portal – Global System Prompt** (Super Admin, Super Manager, Super Viewer only).

---

You are enhancing the **admin portal** (used only by Super Admin, Super Manager, and Super Viewer roles) with powerful **reporting and analytics** focused on:

- Quiz performance and player behavior.  
- AdMob revenue and ad performance.  
- Revenue sharing to users (coins and PKR).  
- Payouts, liabilities, and profitability.

The data model includes (from previous prompts):

- `profiles`, `admin_profiles`.  
- `questions`, `quizzes`, `quiz_questions`, `user_quiz_sessions`.  
- `admob_apps`, `ad_impressions`, `ad_revenue_snapshots`.  
- `ad_revenue_shares`, `ad_revenue_user_distributions`.  
- `coin_transactions`, `payout_requests`, `app_settings`.  
- `audit_logs`.

## Goal

Design and implement **reporting modules** that provide:

1. Time‑series analytics.  
2. Funnel and conversion analysis.  
3. Per‑quiz and per‑segment performance.  
4. AdMob revenue and eCPM insights.  
5. Revenue share and payout health.  

All exposed via dedicated backend queries and frontend views in the admin portal.

## Reporting Areas

### 1. User Growth & Engagement

Define metrics and queries for:

- Daily/weekly/monthly **new users** (from `profiles.created_at`).  
- Daily/weekly/monthly **active users** (users who completed at least one quiz in `user_quiz_sessions`).  
- Retention:
  - D1, D7, D30 retention based on first quiz completion date.  
- Average sessions per user per day/week.  
- Distribution of quiz completion rates:
  - Percentage of sessions where all questions are completed vs early exits.

Implement:

- Aggregation queries or SQL views for:
  - `user_growth_stats(date)`  
  - `user_engagement_stats(date)`  
  - `user_retention_stats(cohort_date, day_offset)`

### 2. Quiz and Question Performance

Define analytics for:

- Per‑quiz metrics:
  - Number of sessions started/completed.  
  - Average score and completion rate.  
  - Average coins earned per session.  
  - Distribution by difficulty and category.  
- Per‑question metrics:
  - Times shown, times answered.  
  - Correct answer rate.  
  - Skip/abandon rate (if the user leaves on this question).  

Implement:

- Views or materialized views such as:
  - `quiz_performance_stats(quiz_id, date)`  
  - `question_performance_stats(question_id, date)`  
- APIs to fetch:
  - Top performing quizzes (high engagement, high revenue).  
  - Underperforming quizzes/questions (low completion, confusing questions).

### 3. AdMob Revenue & Ad Performance

Use `ad_revenue_snapshots` and `ad_impressions` to define:

- Daily per‑app metrics:
  - Impressions, clicks, CTR.  
  - Estimated earnings (USD and PKR).  
  - eCPM (earnings per 1000 impressions).  
- Per‑quiz and per‑session ad behavior:
  - Average number of ads per session (should be close to number of questions answered, up to 10).  
  - Drop‑off after ads (e.g. how many users leave after seeing certain ad numbers).  

Implement queries and/or views for:

- `admob_app_daily_stats(app_id, date)`  
- `quiz_ad_performance_stats(quiz_id, date)`  

Ensure you can filter by:

- Date range.  
- AdMob app.  
- Quiz.  

### 4. Revenue Sharing & Wallet Health

Based on `ad_revenue_shares`, `ad_revenue_user_distributions`, `coin_transactions`, and `app_settings`:

Define metrics for:

- For a given period:
  - Total AdMob revenue (PKR).  
  - User share vs platform share (PKR).  
  - Amount actually credited to users as coins.  
- User earnings distribution:
  - Top‑earning users.  
  - Long tail (how many users earn small amounts).  
- Coin and liability overview:
  - Total coins in circulation.  
  - PKR equivalent liability (coins_balance × pkr_per_coin).  
  - Coin velocity (how many coins are generated and withdrawn per day).  

Implement views/APIs:

- `revenue_share_summary(date_range)`  
- `user_earnings_distribution(date_range)`  
- `coin_liability_stats(date)`  

### 5. Payouts & Cashflow

Using `payout_requests` and `coin_transactions`:

- Define metrics:
  - Number and volume (PKR) of payout requests by status and method.  
  - Average time from request to `paid`.  
  - Rejection rates and common reasons.  
  - Cash outflow over time vs AdMob inflow.  

Implement:

- Queries/views:
  - `payout_stats(date_range)`  
  - `payout_method_breakdown(date_range)`  
  - `payout_sla_stats(date_range)`  

### 6. Implementation Details

From this prompt, generate:

1. **SQL views or materialized views** for the metrics above, or equivalent Supabase/PostgreSQL functions.  
2. **Backend endpoints** (e.g. under `/api/admin/reporting/...`) that:
   - Accept filters (date range, quiz id, app id).  
   - Return structured JSON suitable for charts (time‑series arrays, category breakdowns).  
3. **TypeScript types** for analytic responses to keep frontend types consistent.

Focus on:

- Efficient aggregations (indexes, group by).  
- Clear naming conventions (e.g. `*_stats`, `*_summary`).  
- Separation of concerns between:
  - Raw transactional tables.  
  - Analytic views.  
  - API layer that exposes analytics to the admin UI.
