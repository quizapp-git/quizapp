# Admin Portal – Frontend UI Prompt

Use this prompt in WebPrompts to generate the **Next.js admin UI** for the quiz + AdMob revenue‑sharing platform, consuming the backend APIs defined in the previous prompt.

This UI builds on the admin roles defined in the **Admin Portal – Global System Prompt** (Super Admin, Super Manager, Super Viewer) and must never expose admin routes to regular player accounts.

---

You are building the **admin frontend** using:

- Next.js (App Router, TypeScript).  
- React for UI components.  
- Any light UI framework (e.g. Tailwind or simple CSS).  
- APIs under `/api/admin/...` as defined previously.

The portal is **admin‑only** (accessible only to Super Admin, Super Manager, and Super Viewer accounts, never regular players) and manages:

- Questions, AI generator, quizzes.  
- Users and leaderboards.  
- Gold coins, withdrawals, and payouts.  
- AdMob app integration and revenue sharing.  
- Global settings and audit logs.

## 1. Layout, Navigation, and Auth Guard

Implement:

- `app/admin/layout.tsx`:
  - Shared layout for all admin pages.
  - Left sidebar with navigation links:
    - Dashboard
    - Question Bank
    - AI Question Generator
    - Quiz Challenges
    - Users
    - Leaderboard
    - Earnings & Payouts
    - AdMob & Revenue Share
    - Settings
    - Audit Logs
  - Top bar:
    - Logged‑in admin email.
    - Environment label (Development/Production).
    - Logout button (Supabase sign out).

- `app/admin/login/page.tsx`:
  - Email + password login form using Supabase Auth.
  - On success, verify user is an admin (via admin API or metadata).
  - If not admin, show “Access restricted to administrators” and sign them out.

- Auth guard:
  - Server‑side or client‑side check on all `/admin/*` routes to ensure a valid admin session; otherwise redirect to `/admin/login`.

## 2. Dashboard (`/admin`)

Create a **dashboard overview** page that calls summary APIs and displays:

- Cards for:
  - Total questions.
  - Total quizzes (draft/published).
  - Number of active users.
  - Total coins in circulation.
  - PKR liability.
  - Total PKR paid out in payouts.
- AdMob summary:
  - Total impressions today and in the last 7/30 days.
  - Estimated AdMob earnings (PKR) for selected period.
  - User vs platform revenue split based on current share settings.

Use simple responsive cards and charts (optional) to present data clearly.

## 3. Question Bank (`/admin/questions`)

Pages/components:

- List view:
  - Table of questions with columns:
    - Question text (truncated).
    - Category.
    - Difficulty.
    - Tags.
    - Active status.
    - Created at.
  - Filters:
    - Search text.
    - Category.
    - Difficulty.
    - Tag.
    - Active/inactive.
  - Pagination controls.
  - Actions per row:
    - View/Edit.
    - Activate/Deactivate.
  - “Create Question” button.

- Create/Edit form:
  - Fields:
    - Question text (textarea).
    - Options (dynamic list of inputs).
    - Correct option selection (radio or dropdown tied to options).
    - Category (text or select).
    - Tags (chips or comma‑separated).
    - Difficulty (select).
    - Active status toggle.
  - Client‑side validation aligned with backend rules.

## 4. AI Question Generator (`/admin/ai-generator`)

Page flow:

- Top form:
  - Topic / category (text).
  - Difficulty (select: easy, medium, hard).
  - Number of questions to generate (e.g. 5–50).
  - Tags (comma‑separated).
  - “Generate” button.

- On submit:
  - Call `POST /api/admin/ai/generate-questions`.
  - Show loading state and handle errors.

- Results area:
  - Table/list of generated questions with:
    - Question text.
    - Options.
    - Correct answer.
    - Difficulty/category.
  - Controls:
    - Checkbox to select/deselect questions.
    - In‑place editing for minor corrections (optional).
  - “Save selected” button:
    - Calls `POST /api/admin/ai/save-generated-questions`.
    - Shows summary: X saved, Y failed.

## 5. Quiz Challenges (`/admin/quizzes`)

List page:

- Table with:
  - Title.
  - Status (draft/published/archived).
  - Difficulty.
  - Total questions.
  - Reward coins.
  - Created at.
- Filters:
  - Status.
  - Difficulty.
  - Created date range.
- Actions:
  - View / Edit.
  - Duplicate.
  - Archive.

Quiz builder / editor:

- Step 1: Quiz metadata form:
  - Title, description.
  - Difficulty (easy/medium/hard/mixed).
  - Time limit (optional).
  - Reward coins.
  - Status (draft/published).

- Step 2: Question selection:
  - Search/filter existing questions by category/difficulty/tags.
  - Multi‑select questions to add to quiz.
  - Show selected questions list with ability to reorder (drag‑and‑drop) and remove.
  - Enforce total questions limit (e.g. up to 10 if that matches gameplay).

- Step 3: Review:
  - Summary of quiz, list of selected questions.
  - Actions: Save draft, Publish.

## 6. Users & Leaderboard (`/admin/users`, `/admin/leaderboard`)

Users page:

- Table with:
  - Username.
  - Email.
  - Coins balance.
  - Lifetime earned coins.
  - Quizzes played.
  - Join date.
  - Blocked status.
- Filters:
  - Blocked/unblocked.
  - Min coins.
  - Date joined range.
  - Search by email/username.
- Row actions:
  - View details.
  - Block/Unblock.
  - Adjust coins (opens modal).

User detail page:

- Sections:
  - Profile info.
  - Recent quiz sessions (from `user_quiz_sessions`).
  - Coin transactions history (with type, amount, PKR value, description).
  - Ad‑related metrics (e.g. total ad impressions, total AdMob share coins).

Leaderboard page:

- Tabs or filters for:
  - All‑time.
  - Weekly.
  - Monthly.
- Table:
  - Rank.
  - Username.
  - Coins or earnings used for ranking.
  - Quizzes played.

## 7. Earnings & Payouts (`/admin/earnings`)

Summary section:

- Cards showing:
  - Total coins in circulation.
  - PKR equivalent liability (based on current coin value).
  - Total PKR paid out so far.
  - Pending payouts count and amount.

Payouts table:

- Filters:
  - Status (pending/approved/rejected/paid).
  - Method (bank transfer, Easypaisa, JazzCash).
  - Date range.
  - Min/max PKR.
- Columns:
  - User (username/email).
  - Coins requested.
  - PKR amount.
  - Method.
  - Status.
  - Requested at.
- Actions per row:
  - View details.
  - Approve (with confirmation and optional notes).
  - Reject (with notes and option to refund coins).
  - Mark as Paid.

Payout detail page:

- Shows:
  - User profile info and coin balances.
  - Payout method details (bank account, Easypaisa/JazzCash number).
  - Related coin transactions.
  - Admin action log for this request.

## 8. AdMob & Revenue Sharing (`/admin/admob`)

AdMob apps management:

- List page:
  - Shows all `admob_apps` with name, platform, AdMob app id, ad unit ids.
  - Actions: Create, Edit, Disable (if needed).

Revenue and impressions dashboard:

- Filters:
  - App.
  - Date range.
- Views:
  - Chart/table of `ad_revenue_snapshots`:
    - Impressions.
    - Clicks.
    - Estimated earnings (PKR).
  - Current revenue share settings (user vs platform).
  - Summary metrics:
    - User share PKR and platform share PKR for selected period.

User distribution view:

- For a chosen date or period:
  - Table of `ad_revenue_user_distributions`:
    - User.
    - Impressions count.
    - Share PKR.
    - Share coins.
  - Indication if coins have already been credited (link to coin transaction).

Controls:

- Button to trigger **distribution** for a date range (calls `/api/admin/admob/revenue-share/distribute`).
- Button or status to show last distribution run.

## 9. Settings & Audit Logs (`/admin/settings`, `/admin/audit-logs`)

Settings page:

- Tabs:
  - Earnings:
    - Display and edit `coins_to_pkr` (PKR per coin).
    - Display and edit `withdrawal_threshold` (min PKR, default 500).
    - Show a warning when lowering threshold or changing coin value.
  - Revenue Sharing:
    - Display and edit `user_share_percent` and `platform_share_percent`.
  - Security:
    - List admin accounts from `admin_profiles`.
    - Controls to add/remove admin rights (with confirmation).

Audit logs page:

- Filters:
  - Date range.
  - Admin.
  - Action type.
  - Target type.
- Table columns:
  - Timestamp.
  - Admin.
  - Action.
  - Target type/id.
  - Short metadata summary.
- Detail drawer/modal:
  - Show full `metadata` JSON pretty‑printed.

Focus on a clean, consistent admin UX that makes it easy for a non‑technical admin to:

- Manage questions and quizzes.  
- Understand and control how AdMob revenue is shared with users.  
- Monitor coins, payouts, and liabilities.  
- Audit all critical actions performed in the system.
