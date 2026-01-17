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
  ('ad_revenue_share', jsonb_build_object('user_share_percent', 50, 'platform_share_percent', 50)),
  (
    'communication_policy',
    jsonb_build_object(
      'text_preset_only_max_ads',
      99,
      'text_custom_min_ads',
      100,
      'voice_chat_min_ads',
      500
    )
  )
on conflict (key) do update set value = excluded.value;

create table if not exists public.user_communication_overrides (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  forced_stage text not null check (
    forced_stage in ('PRESET_ONLY','CUSTOM_TEXT','VOICE_ENABLED')
  ),
  expires_at timestamptz
);

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

create table if not exists public.ad_providers (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('ADMOB','META','UNITY','APPLOVIN','OTHER')),
  is_enabled boolean not null default true,
  weight integer not null default 100,
  platform text not null check (platform in ('android','ios','both')),
  environment text not null check (environment in ('dev','staging','prod')),
  ad_unit_interstitial text,
  ad_unit_rewarded text,
  ad_unit_banner text,
  created_at timestamptz not null default now()
);

create table if not exists public.app_ad_settings (
  id uuid primary key default gen_random_uuid(),
  ads_enabled boolean not null default true,
  max_ads_per_quiz_session integer not null default 10,
  show_ad_after_every_question boolean not null default true,
  created_at timestamptz not null default now()
);

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
  key text unique not null,
  text text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by_admin_id uuid references public.admin_profiles (id)
);

create table if not exists public.quick_chat_events (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles (id),
  to_user_id uuid references public.profiles (id),
  quick_chat_message_id uuid not null references public.quick_chat_messages (id),
  quiz_id uuid references public.quizzes (id),
  session_id uuid references public.user_quiz_sessions (id),
  context text,
  created_at timestamptz not null default now()
);

create index if not exists idx_quick_chat_events_session_id on public.quick_chat_events (session_id);
create index if not exists idx_quick_chat_events_quiz_id on public.quick_chat_events (quiz_id);
create index if not exists idx_quick_chat_events_from_user on public.quick_chat_events (from_user_id);

create table if not exists public.voice_rooms (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid references public.quizzes (id),
  room_code text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.voice_room_participants (
  id uuid primary key default gen_random_uuid(),
  voice_room_id uuid not null references public.voice_rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  joined_at timestamptz not null default now(),
  left_at timestamptz
);

create index if not exists idx_voice_room_participants_room on public.voice_room_participants (voice_room_id);
create index if not exists idx_voice_room_participants_user on public.voice_room_participants (user_id);

create view if not exists public.user_growth_stats as
select
  date_trunc('day', created_at)::date as date,
  count(*) as new_users
from public.profiles
group by 1;

create view if not exists public.user_engagement_stats as
with sessions_by_day as (
  select
    date_trunc('day', started_at)::date as date,
    user_id,
    count(*) as sessions_started,
    count(*) filter (where completed_at is not null) as sessions_completed
  from public.user_quiz_sessions
  group by 1, user_id
)
select
  date,
  count(distinct user_id) as dau,
  sum(sessions_started) as total_sessions_started,
  sum(sessions_completed) as total_sessions_completed,
  avg(sessions_started::numeric) as avg_sessions_per_user
from sessions_by_day
group by date;

create view if not exists public.user_retention_stats as
with first_completion as (
  select
    user_id,
    min(completed_at::date) as cohort_date
  from public.user_quiz_sessions
  where completed_at is not null
  group by user_id
),
activity as (
  select distinct
    s.user_id,
    s.completed_at::date as activity_date
  from public.user_quiz_sessions s
  where s.completed_at is not null
)
select
  f.cohort_date,
  (a.activity_date - f.cohort_date) as day_offset,
  count(distinct a.user_id) as active_users
from first_completion f
join activity a on a.user_id = f.user_id
group by f.cohort_date, day_offset
having day_offset in (1, 7, 30);

create view if not exists public.user_completion_stats as
select
  date_trunc('day', started_at)::date as date,
  count(*) as sessions_started,
  count(*) filter (where completed_at is not null) as sessions_completed
from public.user_quiz_sessions
group by 1;

create view if not exists public.quiz_performance_stats as
select
  q.id as quiz_id,
  date_trunc('day', s.started_at)::date as date,
  count(*) as sessions_started,
  count(*) filter (where s.completed_at is not null) as sessions_completed,
  avg(s.correct_answers::numeric) as avg_correct_answers,
  avg(s.coins_earned::numeric) as avg_coins_earned,
  case
    when count(*) > 0 then
      count(*) filter (where s.completed_at is not null) / count(*)::numeric
    else 0
  end as completion_rate,
  q.difficulty,
  q.title,
  q.status
from public.quizzes q
join public.user_quiz_sessions s on s.quiz_id = q.id
group by q.id, date, q.difficulty, q.title, q.status;

create view if not exists public.admob_app_daily_stats as
select
  s.admob_app_id,
  s.date,
  s.impressions,
  s.clicks,
  s.estimated_earnings_usd,
  s.estimated_earnings_pkr,
  case
    when s.impressions > 0 then (s.estimated_earnings_pkr * 1000) / s.impressions
    else 0
  end as ecpm_pkr,
  case
    when s.impressions > 0 then (s.clicks::numeric * 100) / s.impressions
    else 0
  end as ctr
from public.ad_revenue_snapshots s;

create view if not exists public.quiz_ad_performance_stats as
with sessions_ads as (
  select
    s.id as session_id,
    s.quiz_id,
    date_trunc('day', s.started_at)::date as date,
    count(i.id) as ads_shown,
    max(i.question_index) as max_question_index
  from public.user_quiz_sessions s
  left join public.ad_impressions i on i.session_id = s.id
  group by s.id, s.quiz_id, date
)
select
  quiz_id,
  date,
  avg(ads_shown::numeric) as avg_ads_per_session,
  count(*) filter (where max_question_index >= 1) as sessions_after_first_ad,
  count(*) filter (where max_question_index >= 3) as sessions_after_third_ad,
  count(*) filter (where max_question_index >= 5) as sessions_after_fifth_ad,
  count(*) as total_sessions
from sessions_ads
group by quiz_id, date;

create view if not exists public.revenue_share_summary as
select
  r.date,
  r.admob_app_id,
  r.total_earnings_pkr,
  r.user_share_pkr,
  r.platform_share_pkr
from public.ad_revenue_shares r;

create view if not exists public.user_earnings_distribution as
select
  d.date,
  d.user_id,
  sum(d.share_pkr) as total_share_pkr,
  sum(d.share_coins) as total_share_coins
from public.ad_revenue_user_distributions d
group by d.date, d.user_id;

create view if not exists public.coin_liability_stats as
with coin_settings as (
  select
    (value->>'pkr_per_coin')::numeric(10,2) as pkr_per_coin
  from public.app_settings
  where key = 'coins_to_pkr'
)
select
  current_date as date,
  sum(p.coins_balance) as total_coins_in_circulation,
  sum(p.coins_balance)::numeric * cs.pkr_per_coin as total_liability_pkr
from public.profiles p
cross join coin_settings cs;

create view if not exists public.coin_velocity_stats as
select
  date_trunc('day', created_at)::date as date,
  sum(amount_coins) filter (where type in ('earn','ad_revenue_share')) as coins_generated,
  sum(amount_coins) filter (where type in ('withdrawal','spend')) as coins_withdrawn
from public.coin_transactions
group by 1;

create view if not exists public.payout_stats as
select
  date_trunc('day', requested_at)::date as date,
  status,
  count(*) as requests_count,
  sum(pkr_amount) as total_pkr
from public.payout_requests
group by date, status;

create view if not exists public.payout_method_breakdown as
select
  date_trunc('day', requested_at)::date as date,
  method,
  status,
  count(*) as requests_count,
  sum(pkr_amount) as total_pkr
from public.payout_requests
group by date, method, status;

create view if not exists public.payout_sla_stats as
select
  date_trunc('day', requested_at)::date as date,
  avg(extract(epoch from (processed_at - requested_at)) / 3600) filter
    (where status = 'paid' and processed_at is not null) as avg_hours_to_paid,
  count(*) filter (where status = 'paid') as paid_count,
  count(*) filter (where status = 'rejected') as rejected_count
from public.payout_requests
group by date;

create view if not exists public.cashflow_stats as
with admob as (
  select
    date,
    sum(estimated_earnings_pkr) as admob_inflow_pkr
  from public.ad_revenue_snapshots
  group by date
),
payouts as (
  select
    date_trunc('day', processed_at)::date as date,
    sum(pkr_amount) filter (where status = 'paid') as payouts_outflow_pkr
  from public.payout_requests
  where processed_at is not null
  group by date
)
select
  coalesce(a.date, p.date) as date,
  coalesce(a.admob_inflow_pkr, 0) as admob_inflow_pkr,
  coalesce(p.payouts_outflow_pkr, 0) as payouts_outflow_pkr
from admob a
full outer join payouts p on p.date = a.date;

alter table if exists public.quick_chat_messages
  add column if not exists category text not null default 'text';

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  owner_id uuid not null references public.profiles (id),
  icon text,
  is_public boolean not null default false,
  max_members integer not null default 20,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create index if not exists idx_groups_owner_id on public.groups (owner_id);
create index if not exists idx_groups_is_public on public.groups (is_public);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('owner','admin','member')),
  joined_at timestamptz not null default now(),
  is_muted boolean not null default false
);

create unique index if not exists uniq_group_members_group_user
on public.group_members (group_id, user_id);

create index if not exists idx_group_members_group_id on public.group_members (group_id);
create index if not exists idx_group_members_user_id on public.group_members (user_id);

create table if not exists public.group_invitations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  from_user_id uuid not null references public.profiles (id),
  to_user_id uuid not null references public.profiles (id),
  status text not null check (status in ('pending','accepted','rejected','cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create index if not exists idx_group_invitations_group_id on public.group_invitations (group_id);
create index if not exists idx_group_invitations_from_user_id on public.group_invitations (from_user_id);
create index if not exists idx_group_invitations_to_user_id on public.group_invitations (to_user_id);

create table if not exists public.group_chat_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  from_user_id uuid not null references public.profiles (id),
  type text not null check (type in ('quick','emoticon','text')),
  quick_chat_message_id uuid references public.quick_chat_messages (id),
  text text,
  created_at timestamptz not null default now()
);

create index if not exists idx_group_chat_messages_group_id_created_at
on public.group_chat_messages (group_id, created_at desc);

create table if not exists public.chat_filter_rules (
  id uuid primary key default gen_random_uuid(),
  pattern text not null,
  action text not null check (action in ('block','replace','flag')),
  replacement text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.app_settings (key, value)
values (
  'chat_filter',
  jsonb_build_object(
    'enabled', true,
    'strictness', 'medium'
  )
)
on conflict (key) do update set value = excluded.value;

create table if not exists public.player_threshold_overrides (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  min_pkr numeric(12,2) not null,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.badge_catalog (
  id text primary key,
  name text not null,
  description text not null,
  icon_url text,
  category text,
  criteria jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.player_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  badge_id text not null references public.badge_catalog (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  unique(user_id, badge_id)
);

create index if not exists idx_player_badges_user_id on public.player_badges (user_id);

create table if not exists public.player_ratings (
  id uuid primary key default gen_random_uuid(),
  rater_id uuid not null references public.profiles (id),
  ratee_id uuid not null references public.profiles (id),
  stars integer not null check (stars between 1 and 5),
  review text,
  session_id uuid references public.user_quiz_sessions (id),
  created_at timestamptz not null default now(),
  unique(rater_id, ratee_id, session_id)
);

create index if not exists idx_player_ratings_ratee_id on public.player_ratings (ratee_id);
create index if not exists idx_player_ratings_rater_id on public.player_ratings (rater_id);

    'max_message_length', 80,
    'max_messages_per_minute', 10
  )
)
on conflict (key) do update set value = excluded.value;


 
 a l t e r   p u b l i c a t i o n   s u p a b a s e _ r e a l t i m e   a d d   t a b l e   g r o u p _ c h a t _ m e s s a g e s ; 
 
 
