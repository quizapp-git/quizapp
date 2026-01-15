# Player Quiz App – Player Profile Prompt

Use this prompt in WebPrompts to design and implement the **player profile data model, APIs, and mobile UI** for the quiz app, including payout settings, social graph, and player ratings.

---

You are extending the **player-facing quiz app** (React Native + Supabase + PERN backend) to provide a rich **Player Profile** experience that connects identity, earnings, payouts, social features, and reputation.

## Context

- Existing system:
  - Admin portal (PERN + Supabase + Vercel) already manages:
    - Users, quizzes, questions, AdMob revenue sharing, coins, payouts, leaderboards.
  - Player app (React Native) already supports:
    - Auth and basic profile.
    - Quiz discovery and gameplay (up to 10 questions, 1 AdMob ad after each question).
    - Wallet, coins, PKR earnings, payout requests.
    - Friends and group chat modules (see dedicated prompts for chat flows).
- You now need a **unified Player Profile layer** that:
  - Centralizes the player’s identity and payout information.
  - Surfaces participation, earnings, and reputation.
  - Connects to friends/social, ratings, and history.

Assume the backend already has tables like `profiles`, `user_quiz_sessions`, `coin_transactions`, `payout_requests`, `ad_revenue_user_distributions`, and friends/chat-related tables from other prompts.

## Player Profile Goals

Design the Player Profile so that each player has:

1. Core identity and contact details:
   - `user_id` (primary key, references `profiles`/auth).
   - Full name.
   - Mobile number (primary contact for Pakistan).
   - Email.
   - City.
   - Country.
2. Payout configuration:
   - Primary payout account:
     - Bank transfer.
     - Easypaisa.
     - JazzCash.
   - For each method, store:
     - Account title.
     - Account number/IBAN or wallet number.
     - Bank name (for bank transfer).
     - Verification status and timestamps.
   - Ability to mark one account as default for payouts.
3. Earnings and participation summary:
   - Player gold won (total coins earned from quizzes and ad revenue share).
   - Player income in PKR (lifetime and current withdrawable).
   - Withdrawal threshold (global default, plus optional per-player override).
   - Badges based on performance and activity:
     - Example tiers: Bronze, Silver, Gold, Platinum, Legendary.
   - Participation metrics:
     - Total quizzes played.
     - Quizzes won/cleared.
     - Average score/accuracy.
     - Daily/weekly streaks.
     - Last active time.
4. Social graph:
   - Friends list (two-way friendship model).
   - Integration with existing quick chat and group chat features.
   - Counts:
     - Total friends.
     - Pending friend requests.
5. Reputation and ratings:
   - Star-based rating (1–5 stars) given by other players.
   - Average rating and total ratings count.
   - Optional short review/feedback from raters.
6. History:
   - History of payouts (linked to `payout_requests`).
   - History of major milestones:
     - Badge unlocks.
     - Big wins or large payout events.

## Your Additional Suggestions for Player Profile

Extend the feature beyond the basics above. Propose and design:

1. Profile completeness:
   - Track how “complete” a profile is (e.g. 0–100%):
     - Fields like photo, city, payout method, verified phone, verified email.
   - Show a progress bar and checklist on the profile screen.
2. Security and verification:
   - Optional KYC information (e.g. CNIC or national ID) stored securely.
   - Phone/email verification status.
   - Payout account verification steps:
     - Small test transaction, or admin approval.
   - Flags for suspicious activity or account freezes.
3. Personalization:
   - Avatar/photo, display name, and short bio/tagline.
   - Language preference and time zone.
   - Notification preferences:
     - Quiz invites.
     - Friend requests.
     - Payout updates.
     - Promotional/bonus campaigns.
4. Gameplay preferences:
   - Preferred quiz categories and difficulty.
   - Preferred match types (solo, friend vs, group).
   - Consent settings for being discoverable by other players (e.g. “allow friend suggestions”).
5. Analytics and insights:
   - Simple visualizations on profile:
     - Earnings over time (coins and PKR).
     - Win rate and accuracy trends.
     - Participation heatmap (days of week, time-of-day).

Design the schema, APIs, and UI so these suggestions fit naturally into the existing app and backend.

## Data Model and Schema Requirements

Define or extend Supabase/Postgres tables so the Player Profile is normalized, secure, and easily queryable:

1. Profile core:
   - Extend existing `profiles` with:
     - `full_name`, `mobile_number`, `city`, `country`.
     - `avatar_url`, `display_name`, `bio`.
     - `language`, `timezone`.
     - Verification flags (`is_email_verified`, `is_phone_verified`).
2. Payout and payment accounts:
   - New table `player_payment_accounts`:
     - `id` uuid pk.
     - `user_id` references `profiles(id)`.
     - `type` enum: `BANK`, `EASYPAISA`, `JAZZCASH`.
     - Account metadata fields:
       - `account_title`.
       - `account_number`.
       - `bank_name` (nullable except for bank type).
     - `is_default` boolean.
     - `status` enum: `PENDING`, `VERIFIED`, `REJECTED`, `DISABLED`.
     - `created_at`, `updated_at`, `verified_at`.
   - Connect `payout_requests` to `player_payment_accounts` for traceability.
3. Player stats:
   - Either:
     - A `player_stats` table with pre-aggregated columns, or
     - Materialized views over `user_quiz_sessions`, `coin_transactions`, `ad_revenue_user_distributions`.
   - Include:
     - `total_quizzes_played`, `total_quizzes_won`.
     - `total_gold_won`, `lifetime_income_pkr`.
     - `current_balance_coins`, `current_balance_pkr`.
     - `streak_days`, `last_active_at`.
4. Thresholds and badges:
   - Configure a global withdrawal threshold (already elsewhere) and optionally:
     - `player_threshold_overrides` table for per-player overrides.
   - `player_badges`:
     - Badge catalog table (badge id, name, description, criteria, icon).
     - Junction table linking `user_id` to badges with `unlocked_at`.
5. Friends and social:
   - Reuse or extend existing friends tables (from chat prompts) to:
     - Track friendship status: `PENDING`, `ACCEPTED`, `BLOCKED`.
     - Store timestamps for requests and acceptances.
   - Ensure queries can efficiently fetch a player’s friends list for profile.
6. Ratings and reviews:
   - New table `player_ratings`:
     - `id` uuid pk.
     - `rater_id` references `profiles(id)`.
     - `ratee_id` references `profiles(id)`.
     - `stars` integer 1–5.
     - `review` text nullable.
     - Optional `source_session_id` referencing `user_quiz_sessions`.
     - `created_at`.
   - Enforce:
     - One rating per rater/ratee per quiz session.
     - Aggregate views or computed columns for average rating and count.

Be explicit about indexes, foreign keys, and constraints for each table.

## API Design Requirements

Design REST (or RPC) endpoints under `/api/app/profile/...` that the mobile app will call:

1. Core profile:
   - `GET /api/app/profile/me`
     - Returns:
       - Core profile fields.
       - Stats summary.
       - Badge summary.
       - Rating summary.
   - `PUT /api/app/profile/me`
     - Updates editable fields:
       - Full name, city, country, avatar, display name, bio, language, timezone.
     - Validates mobile/email where relevant.
2. Payment accounts:
   - `GET /api/app/profile/payment-accounts`
   - `POST /api/app/profile/payment-accounts`
     - Create new payout method (bank/Easypaisa/JazzCash).
   - `PUT /api/app/profile/payment-accounts/:id`
     - Update account details or mark as default.
   - `DELETE /api/app/profile/payment-accounts/:id`
   - Optional:
     - `POST /api/app/profile/payment-accounts/:id/verify` (trigger verification flow).
3. Stats and history:
   - `GET /api/app/profile/earnings-history`
     - Returns coins/PKR history with pagination.
   - `GET /api/app/profile/payout-history`
     - Returns payout requests with amounts, method, status.
4. Friends:
   - `GET /api/app/profile/friends`
   - `POST /api/app/profile/friends/request`
   - `POST /api/app/profile/friends/accept`
   - `POST /api/app/profile/friends/decline`
   - `POST /api/app/profile/friends/remove`
   - `POST /api/app/profile/block` and `POST /api/app/profile/unblock` if needed.
5. Ratings:
   - `POST /api/app/profile/rate`
     - Input: `ratee_id`, `stars`, optional `review`, optional `session_id`.
   - `GET /api/app/profile/:user_id/ratings`
     - Returns paginated ratings list and aggregates.

Specify auth (must be logged-in player), validation rules, rate limiting (for abuse prevention), and how errors are returned.

## Mobile App UX and Screens

Extend the React Native app with a dedicated **Player Profile area**:

1. Profile Home screen:
   - Shows:
     - Avatar, display name, full name (optional), city, country.
     - Star rating and count.
     - Key stats: total gold won, PKR earned, quizzes played, win rate.
     - Badge strip (recent or highest-tier badges).
     - Profile completeness bar and checklist.
   - Actions:
     - Edit Profile.
     - Manage Payout Methods.
     - View Earnings & Payout History.
2. Edit Profile screen:
   - Forms for:
     - Name, city, country, bio, language, timezone.
     - Mobile and email (with verification status indicators).
   - Client-side validation and inline error messages.
3. Payout Methods screen:
   - CRUD UI for bank/Easypaisa/JazzCash accounts:
     - Mark default, see status (pending/verified/rejected).
   - Educate users about verification and thresholds.
4. Stats and Insights screen:
   - Charts or cards for:
     - Earnings over time.
     - Quizzes played, win rate, streaks.
     - Progress towards next badge or threshold.
5. Friends and Ratings integration:
   - From profile, navigate to:
     - Friends list screen (integrated with existing chat features).
     - Ratings screen showing feedback from other players.
   - Post-game flow:
     - After multiplayer sessions, prompt users to rate each other.

Design navigation so Player Profile feels like a central, always-available section (e.g. dedicated tab or top-level screen).

## Security, Privacy, and Compliance

Define guidelines and implementation details for:

- Protecting payout and KYC data:
  - Encryption at rest where appropriate.
  - Restricted access via row-level security policies in Supabase.
- Limiting who can see what:
  - Public vs private profile fields.
  - Only the player (and admins) can see sensitive payout info.
- Abuse prevention:
  - Rate limiting for friend requests and ratings.
  - Reporting/blocking tools for abusive players.
- Audit logs:
  - Track changes to payout accounts, thresholds, and KYC data.

## Deliverables

From this prompt, generate:

1. Database schema definitions or migrations for:
   - Profile core extensions.
   - Payment accounts, stats, badges, ratings, and any overrides.
2. Backend API specification and example handlers under `/api/app/profile/...`.
3. React Native UI/UX design:
   - Screen list, navigation flow, and key components for Player Profile.
4. Security and RLS policy recommendations for protecting profile and payout data.

Ensure the design integrates cleanly with the existing quiz, wallet, payout, friends, and chat features while keeping the Player Profile as the central hub of the player’s identity and earnings.

