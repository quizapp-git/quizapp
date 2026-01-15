create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  username text unique,
  created_at timestamptz not null default now(),
  is_blocked boolean not null default false,
  coins_balance integer not null default 0,
  lifetime_earned_coins integer not null default 0,
  full_name text,
  mobile_number text,
  city text,
  country text,
  avatar_url text,
  display_name text,
  bio text,
  language text,
  timezone text,
  is_email_verified boolean not null default false,
  is_phone_verified boolean not null default false,
  chat_muted_until timestamptz
);

create index if not exists idx_profiles_created_at on public.profiles (created_at desc);

create table if not exists public.admin_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now(),
  is_super_admin boolean not null default false
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  question_text text not null,
  options jsonb not null,
  correct_option_index integer not null,
  category text not null,
  tags text[] not null default '{}',
  difficulty text not null check (difficulty in ('easy','medium','hard')),
  created_by_admin_id uuid references public.admin_profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create index if not exists idx_questions_category on public.questions (category);
create index if not exists idx_questions_difficulty on public.questions (difficulty);

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null check (status in ('draft','published','archived')),
  total_questions integer not null default 0,
  time_limit_seconds integer,
  difficulty text not null check (difficulty in ('easy','medium','hard','mixed')),
  reward_coins integer not null default 0,
  created_by_admin_id uuid references public.admin_profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_quizzes_status on public.quizzes (status);
create index if not exists idx_quizzes_difficulty on public.quizzes (difficulty);

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  question_id uuid not null references public.questions (id),
  sequence integer not null,
  unique (quiz_id, question_id)
);

create index if not exists idx_quiz_questions_quiz_id_sequence on public.quiz_questions (quiz_id, sequence);

create table if not exists public.user_quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  quiz_id uuid not null references public.quizzes (id),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  total_questions integer not null,
  correct_answers integer not null default 0,
  coins_earned integer not null default 0
);

create index if not exists idx_user_quiz_sessions_user_id on public.user_quiz_sessions (user_id);
create index if not exists idx_user_quiz_sessions_quiz_id on public.user_quiz_sessions (quiz_id);
create index if not exists idx_user_quiz_sessions_completed_at on public.user_quiz_sessions (completed_at);

create table if not exists public.coin_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  type text not null check (type in ('earn','spend','adjustment','withdrawal','ad_revenue_share')),
  amount_coins integer not null,
  pkr_value_per_coin numeric(10,2) not null,
  description text,
  payout_request_id uuid references public.payout_requests (id),
  created_at timestamptz not null default now(),
  created_by_admin_id uuid references public.admin_profiles (id)
);

create index if not exists idx_coin_transactions_user_id_created_at on public.coin_transactions (user_id, created_at desc);

create table if not exists public.payout_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  coins_requested integer not null,
  pkr_amount numeric(12,2) not null,
  status text not null check (status in ('pending','approved','rejected','paid')),
  method text not null check (method in ('bank_transfer','easypaisa','jazzcash')),
  method_details jsonb not null,
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by_admin_id uuid references public.admin_profiles (id),
  notes text,
  payment_account_id uuid references public.player_payment_accounts (id)
);

create index if not exists idx_payout_requests_user_id on public.payout_requests (user_id);
create index if not exists idx_payout_requests_status_requested_at on public.payout_requests (status, requested_at desc);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null
);

insert into public.app_settings (key, value)
values
  ('coins_to_pkr', jsonb_build_object('pkr_per_coin', 1)),
  ('withdrawal_threshold', jsonb_build_object('min_pkr', 500)),
  ('ad_revenue_share', jsonb_build_object('user_share_percent', 50, 'platform_share_percent', 50))
on conflict (key) do update set value = excluded.value;

create table if not exists public.admob_apps (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  platform text not null check (platform in ('android','ios','web')),
  admob_app_id text not null,
  ad_unit_id_interstitial text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ad_impressions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id),
  quiz_id uuid references public.quizzes (id),
  session_id uuid references public.user_quiz_sessions (id),
  admob_app_id uuid references public.admob_apps (id),
  question_index integer not null check (question_index between 1 and 10),
  impressed_at timestamptz not null default now()
);

create index if not exists idx_ad_impressions_user_id on public.ad_impressions (user_id);
create index if not exists idx_ad_impressions_quiz_id on public.ad_impressions (quiz_id);
create index if not exists idx_ad_impressions_session_id on public.ad_impressions (session_id);

create table if not exists public.ad_revenue_snapshots (
  id uuid primary key default gen_random_uuid(),
  admob_app_id uuid not null references public.admob_apps (id),
  date date not null,
  impressions bigint not null,
  clicks bigint not null default 0,
  estimated_earnings_usd numeric(12,4) not null,
  estimated_earnings_pkr numeric(12,2) not null,
  unique (admob_app_id, date)
);

create index if not exists idx_ad_revenue_snapshots_date on public.ad_revenue_snapshots (date);

create table if not exists public.ad_revenue_shares (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  admob_app_id uuid not null references public.admob_apps (id),
  total_earnings_pkr numeric(12,2) not null,
  user_share_percent numeric(5,2) not null,
  platform_share_percent numeric(5,2) not null,
  user_share_pkr numeric(12,2) not null,
  platform_share_pkr numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_ad_revenue_shares_date_app on public.ad_revenue_shares (date, admob_app_id);

create table if not exists public.ad_revenue_user_distributions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  user_id uuid not null references public.profiles (id),
  admob_app_id uuid not null references public.admob_apps (id),
  impressions_count bigint not null,
  share_pkr numeric(12,2) not null,
  share_coins integer not null,
  coin_transaction_id uuid references public.coin_transactions (id),
  created_at timestamptz not null default now()
);

create index if not exists idx_ad_revenue_user_distributions_user_date on public.ad_revenue_user_distributions (user_id, date);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.admin_profiles (id),
  action text not null,
  target_type text not null,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_admin_id_created_at on public.audit_logs (admin_id, created_at desc);

create table if not exists public.player_payment_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  type text not null check (type in ('BANK','EASYPAISA','JAZZCASH')),
  account_title text not null,
  account_number text not null,
  bank_name text,
  is_default boolean not null default false,
  status text not null check (status in ('PENDING','VERIFIED','REJECTED','DISABLED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  verified_at timestamptz
);

create index if not exists idx_player_payment_accounts_user_id on public.player_payment_accounts (user_id);

create unique index if not exists uniq_player_payment_accounts_default_per_user
on public.player_payment_accounts (user_id)
where is_default;

create table if not exists public.player_stats (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  total_quizzes_played integer not null default 0,
  total_quizzes_won integer not null default 0,
  total_gold_won integer not null default 0,
  lifetime_income_pkr numeric(12,2) not null default 0,
  current_balance_coins integer not null default 0,
  current_balance_pkr numeric(12,2) not null default 0,
  streak_days integer not null default 0,
  last_active_at timestamptz
);

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles (id),
  to_user_id uuid not null references public.profiles (id),
  status text not null check (status in ('pending','accepted','rejected','blocked','cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create index if not exists idx_friend_requests_from_user on public.friend_requests (from_user_id);
create index if not exists idx_friend_requests_to_user on public.friend_requests (to_user_id);

create unique index if not exists uniq_friend_requests_pending_pair
on public.friend_requests (from_user_id, to_user_id)
where status = 'pending';

create table if not exists public.friends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  friend_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create unique index if not exists uniq_friends_pair on public.friends (user_id, friend_id);
create index if not exists idx_friends_user_id on public.friends (user_id);

create table if not exists public.quick_chat_messages (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.quick_chat_events (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles (id),
  to_user_id uuid references public.profiles (id),
  session_id uuid references public.user_quiz_sessions (id),
  quick_chat_message_id uuid not null references public.quick_chat_messages (id),
  created_at timestamptz not null default now()
);

create index if not exists idx_quick_chat_events_session_id on public.quick_chat_events (session_id);

