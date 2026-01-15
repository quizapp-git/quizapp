# Admin Portal – Supabase Schema & Config Prompt

Use this prompt in WebPrompts to generate the **PostgreSQL (Supabase) schema** and configuration needed for the admin portal of the quiz + AdMob revenue‑sharing system.

This schema builds on the admin access model defined in the **Admin Portal – Global System Prompt**, where only Super Admin, Super Manager, and Super Viewer roles can use the admin portal (never regular players).

---

You are designing the **database layer in Supabase** for an admin‑only portal that manages:

- Question bank and quizzes.  
- Users and leaderboards.  
- Gold coins with PKR value and withdrawals.  
- AdMob revenue tracking and revenue sharing with users.  
- Admins, settings, and audit logs.

The quiz experience is:

- Users play quizzes of up to **10 questions**.  
- After every question, they see an **AdMob ad**, so a full quiz session shows up to **10 ads**.  
- Income from AdMob across all quiz apps is **shared with users** according to configurable rules.

## Requirements

Produce SQL (or Supabase migration definition) that creates the following logical areas:

### 1. Core User and Admin Profiles

- `profiles` (regular players):
  - `id` uuid pk (matches `auth.users.id`).
  - `email` text not null.
  - `username` text.
  - `created_at` timestamptz default now().
  - `is_blocked` boolean default false.
  - `coins_balance` int not null default 0.
  - `lifetime_earned_coins` int not null default 0.

- `admin_profiles`:
  - `id` uuid pk (matches `auth.users.id`).
  - `email` text not null.
  - `created_at` timestamptz default now().
  - `is_super_admin` boolean not null default false.

### 2. Question Bank and Quizzes

- `questions`:
  - `id` uuid pk.
  - `question_text` text not null.
  - `options` jsonb not null (array of answer strings).
  - `correct_option_index` int not null.
  - `category` text not null.
  - `tags` text[] not null default '{}'.
  - `difficulty` text not null, constrained to `('easy','medium','hard')`.
  - `created_by_admin_id` uuid references `admin_profiles(id)`.
  - `created_at` timestamptz default now().
  - `updated_at` timestamptz default now().
  - `is_active` boolean not null default true.

- `quizzes`:
  - `id` uuid pk.
  - `title` text not null.
  - `description` text.
  - `status` text not null (`'draft' | 'published' | 'archived'`).
  - `total_questions` int not null default 0.
  - `time_limit_seconds` int.
  - `difficulty` text not null (`'easy' | 'medium' | 'hard' | 'mixed'`).
  - `reward_coins` int not null default 0.
  - `created_by_admin_id` uuid references `admin_profiles(id)`.
  - `created_at`, `updated_at` timestamptz.

- `quiz_questions`:
  - `id` uuid pk.
  - `quiz_id` uuid references `quizzes(id)` on delete cascade.
  - `question_id` uuid references `questions(id)`.
  - `sequence` int not null.
  - Unique constraint `(quiz_id, question_id)`.

- `user_quiz_sessions`:
  - `id` uuid pk.
  - `user_id` uuid references `profiles(id)`.
  - `quiz_id` uuid references `quizzes(id)`.
  - `started_at` timestamptz default now().
  - `completed_at` timestamptz.
  - `total_questions` int not null.
  - `correct_answers` int not null default 0.
  - `coins_earned` int not null default 0.

### 3. Gold Coins, PKR Value, and Payouts

- `coin_transactions`:
  - `id` uuid pk.
  - `user_id` uuid references `profiles(id)`.
  - `type` text not null (`'earn' | 'spend' | 'adjustment' | 'withdrawal' | 'ad_revenue_share'`).
  - `amount_coins` int not null (positive for earning, negative for spending).
  - `pkr_value_per_coin` numeric(10,2) not null.
  - `description` text.
  - `payout_request_id` uuid references `payout_requests(id)` null.
  - `created_at` timestamptz default now().
  - `created_by_admin_id` uuid references `admin_profiles(id)` null.

- `payout_requests`:
  - `id` uuid pk.
  - `user_id` uuid references `profiles(id)`.
  - `coins_requested` int not null.
  - `pkr_amount` numeric(12,2) not null.
  - `status` text not null (`'pending' | 'approved' | 'rejected' | 'paid'`).
  - `method` text not null (`'bank_transfer' | 'easypaisa' | 'jazzcash'`).
  - `method_details` jsonb not null.
  - `requested_at` timestamptz default now().
  - `processed_at` timestamptz.
  - `processed_by_admin_id` uuid references `admin_profiles(id)` null.
  - `notes` text.

- `app_settings`:
  - `key` text primary key.
  - `value` jsonb not null.
  - Seed values:
    - `coins_to_pkr` → `{ "pkr_per_coin": <default, e.g. 1> }`.
    - `withdrawal_threshold` → `{ "min_pkr": 500 }`.
    - `ad_revenue_share` → `{ "user_share_percent": 50, "platform_share_percent": 50 }`.

### 4. AdMob Integration & Revenue Sharing

Model AdMob‑related data so the admin portal can:

- Register **multiple quiz apps** using AdMob.  
- Track ad impressions for quiz sessions (1 ad after each question, up to 10).  
- Aggregate AdMob revenue per app, day, and ad unit.  
- Distribute a portion of that revenue to users as coins or PKR.

Create tables such as:

- `admob_apps`:
  - `id` uuid pk.
  - `name` text not null.
  - `platform` text not null (`'android' | 'ios' | 'web'`).
  - `admob_app_id` text not null.
  - `ad_unit_id_interstitial` text not null.
  - `created_at` timestamptz default now().

- `ad_impressions` (high‑level logs, can be aggregated or synced from client/server):
  - `id` uuid pk.
  - `user_id` uuid references `profiles(id)` null.
  - `quiz_id` uuid references `quizzes(id)` null.
  - `session_id` uuid references `user_quiz_sessions(id)` null.
  - `admob_app_id` uuid references `admob_apps(id)`.
  - `question_index` int not null check (question_index between 1 and 10).
  - `impressed_at` timestamptz not null default now().

- `ad_revenue_snapshots` (aggregated from AdMob API):
  - `id` uuid pk.
  - `admob_app_id` uuid references `admob_apps(id)`.
  - `date` date not null.
  - `impressions` bigint not null.
  - `clicks` bigint not null default 0.
  - `estimated_earnings_usd` numeric(12,4) not null.
  - `estimated_earnings_pkr` numeric(12,2) not null.
  - Unique constraint (admob_app_id, date).

- `ad_revenue_shares`:
  - `id` uuid pk.
  - `date` date not null.
  - `admob_app_id` uuid references `admob_apps(id)`.
  - `total_earnings_pkr` numeric(12,2) not null.
  - `user_share_percent` numeric(5,2) not null.
  - `platform_share_percent` numeric(5,2) not null.
  - `user_share_pkr` numeric(12,2) not null.
  - `platform_share_pkr` numeric(12,2) not null.
  - `created_at` timestamptz default now().

- `ad_revenue_user_distributions`:
  - `id` uuid pk.
  - `date` date not null.
  - `user_id` uuid references `profiles(id)`.
  - `admob_app_id` uuid references `admob_apps(id)`.
  - `impressions_count` bigint not null.
  - `share_pkr` numeric(12,2) not null.
  - `share_coins` int not null.
  - `coin_transaction_id` uuid references `coin_transactions(id)` null.
  - `created_at` timestamptz default now().

### 5. Audit Logs

- `audit_logs`:
  - `id` uuid pk.
  - `admin_id` uuid references `admin_profiles(id)`.
  - `action` text not null.
  - `target_type` text not null.
  - `target_id` uuid.
  - `metadata` jsonb.
  - `created_at` timestamptz default now().

### 6. Constraints, Indexes, and RLS Readiness

For each table:

- Add appropriate foreign keys, unique constraints, and indexes for:
  - Common lookup fields (user_id, quiz_id, date).
  - Leaderboards and earnings summarization (lifetime_earned_coins, completed_at).
  - Fast queries on `payout_requests` by status and date.
- Outline which tables will be accessed by:
  - Admins only.
  - Both admins and players (like profiles, quizzes) with RLS.

Deliver a **complete SQL schema** (or equivalent Supabase migrations) ready to be applied in Supabase for this admin portal.
