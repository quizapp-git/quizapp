# Player Quiz App – Friends & Quick Chat Backend Prompt

Use this prompt in WebPrompts to add a **friends system and in-game predefined message chat** (quick chat) to the existing quiz + AdMob + Supabase backend.

---

You are extending the backend for the **player quiz app** to support:

- Users adding each other as **friends**.  
- Simple, safe **predefined message chat** between friends during games.  
- Messages like: “Good”, “Excellent”, “Well played”, “Nice try”, etc.  
- No free-text chat at Stage 1; only predefined phrases controlled by the platform. Custom/free-text chat can be added later for higher communication stages, but must follow the communication policy.

Also see:
- The **Chat & Voice Access Policy Based on Ads Viewed** prompt for the communication stages (Stage 1 preset text, Stage 2 custom text, Stage 3 voice) based on ads watched.
- The **AdMob & Mobile Ad Providers Integration Module** prompt for how ad impressions are tracked and exposed to the communication policy.

The system already supports:

- Supabase schema with `profiles`, `quizzes`, `user_quiz_sessions`, etc.  
- Player APIs under `/api/app/...`.  
- Optionally voice chat and multiplayer quiz rooms.

## 1. Data Model

Add new tables to Supabase/PostgreSQL to support friends and quick chat:

### 1.1 Friend relationships

- `friend_requests`:
  - `id` uuid pk.
  - `from_user_id` uuid references `profiles(id)` not null.
  - `to_user_id` uuid references `profiles(id)` not null.
  - `status` text not null check (status in ('pending','accepted','rejected','blocked','cancelled')).
  - `created_at` timestamptz default now().
  - `responded_at` timestamptz.
  - Unique constraint to prevent duplicate open requests:
    - e.g. unique on `(from_user_id, to_user_id, status)` for `pending`.

- `friends`:
  - `id` uuid pk.
  - `user_id` uuid references `profiles(id)` not null.
  - `friend_user_id` uuid references `profiles(id)` not null.
  - `created_at` timestamptz default now().
  - Unique constraint on `(user_id, friend_user_id)`.
  - Store friendship **bidirectionally** (two rows) or enforce directional convention.

Optionally:

- `blocked_users` for long-term blocking, or treat `status='blocked'` in `friend_requests` as a block flag.

### 1.2 Predefined quick chat messages

- `quick_chat_messages`:
  - `id` uuid pk.
  - `key` text unique not null (e.g. 'GOOD', 'EXCELLENT', 'WELL_PLAYED').
  - `text` text not null (e.g. 'Good', 'Excellent!', 'Well played').
  - `is_active` boolean default true.
  - `created_at` timestamptz default now().
  - `created_by_admin_id` uuid references `admin_profiles(id)` null.

These messages are controlled from the **admin portal** (can be wired later), ensuring no abuse via custom text.

### 1.3 In-game quick chat events

Decide how to store quick chat events for audit / history:

- `quick_chat_events`:
  - `id` uuid pk.
  - `from_user_id` uuid references `profiles(id)` not null.
  - `to_user_id` uuid references `profiles(id)` null (friend or opponent).
  - `quick_chat_message_id` uuid references `quick_chat_messages(id)` not null.
  - `quiz_id` uuid references `quizzes(id)` null.
  - `session_id` uuid references `user_quiz_sessions(id)` null.
  - `context` text null (e.g. 'multiplayer_room', '1v1_match').
  - `created_at` timestamptz default now().

This table may be used for audit and analytics; real-time delivery will be via a realtime channel (see below).

## 2. Friends APIs (`/api/app/friends/...`)

Implement player APIs for friend management:

- `GET /api/app/friends`
  - Returns list of friends for current user:
    - `friend_user_id`, username, avatar (if exists), current online status (if tracked), since when.

- `GET /api/app/friends/requests`
  - Returns:
    - Incoming pending requests.
    - Outgoing pending requests.

- `POST /api/app/friends/request`
  - Body:
    - `to_user_id` (or a username/email, resolved server-side).
  - Behavior:
    - Prevent requesting self.
    - Prevent duplicates (existing pending or accepted friendship).
    - Create `friend_requests` with status `pending`.

- `POST /api/app/friends/request/:id/accept`
  - Only `to_user_id` can accept.
  - Behavior:
    - Set `status='accepted'`, update `responded_at`.
    - Create entries in `friends` for both directions.

- `POST /api/app/friends/request/:id/reject`
  - Only `to_user_id` can reject.
  - Set `status='rejected'`, update `responded_at`.

- `POST /api/app/friends/:friendUserId/remove`
  - Removes friendship (both directions).
  - Optionally also mark an existing request as `cancelled`.

- `POST /api/app/friends/:friendUserId/block`
  - Blocks user (set `status='blocked'` or create in `blocked_users`).
  - Blocked users cannot send friend requests or quick chat messages.

All endpoints:

- Use current authenticated user from Supabase Auth.  
- Validate friendship and blocking states.  
- Return clean error messages for invalid operations (e.g. requesting a user you already blocked).

## 3. Quick Chat APIs (`/api/app/quick-chat/...`)

### 3.0 Communication stages overview (backend perspective)

Tie quick chat behavior to the communication stages:

- Stage 1 – Preset quick chat only:
  - Only allow sending predefined messages from `quick_chat_messages`.
  - Use this prompt as the source of truth for Stage 1 behavior.
- Stage 2 – Custom text unlocked:
  - You may add additional endpoints (e.g. `/api/app/chat/...`) for free-text chat.
  - Those endpoints must check `can_use_custom_text_chat` from the communication policy helper.
- Stage 3 – Voice enabled:
  - Same text chat rules as Stage 2.
  - Voice chat is handled by the voice prompt, but quick chat remains available in parallel.

### 3.1 Predefined messages list

- `GET /api/app/quick-chat/messages`
  - Returns active `quick_chat_messages`:
    - `id`, `key`, `text`.
  - Used by mobile app to render buttons like “Good”, “Excellent”, “Well played”.

### 3.2 Sending quick messages in-game

Decide on a simple, safe real-time mechanism:

Option A: Use **Supabase Realtime** channels (Postgres changes or broadcast).  
Option B: Use a separate real-time service (e.g. WebSocket server, Pusher, Ably).

In either case:

- Define server API for logging and permission checks:

  - `POST /api/app/quick-chat/send`
    - Body:
      - `to_user_id` (friend or opponent).
      - `quick_chat_message_id`.
      - Optional: `quiz_id`, `session_id`, `context`.
    - Behavior:
      - Ensure:
        - Sender is authenticated.
        - Recipient is either a friend or in the same game/room.
        - Sender is not blocked by recipient, and not blocked globally.
        - Sender is allowed to use quick chat under the communication policy (Stage 1 or higher).
      - Insert record into `quick_chat_events`.
      - Trigger realtime delivery via:
        - Supabase Realtime broadcast, or
        - Provider-specific publish method.
    - Returns:
      - Echo of created event (id, timestamps).

### 3.3 Realtime subscription design

Design a channel naming scheme for quick chat:

- Per **game session**:
  - Channel name like `quick_chat:session:{session_id}`.
- Or per **room** (if multiplayer rooms exist):
  - `quick_chat:room:{voice_room_id}`.

Mobile clients:

- Subscribe to appropriate channel when entering a game/session/room.  
- Receive events with:
  - `from_user_id`, `quick_chat_message_id`, `created_at`.  
- Use local mapping of `quick_chat_message_id` → text to display.

## 4. Admin Integration, Safety, and Communication Policy

Integrate with admin portal:

- Admin can:
  - Manage `quick_chat_messages` (create, edit, deactivate).  
  - View summaries of:
    - Most used quick messages.  
    - Users who send very high volumes (possible abuse).  
- Consider:
  - Rate limiting quick chat per user per minute in the API.  
  - Blocking users from chat when necessary (e.g. `profiles.chat_muted_until` field).
  - Wiring quick chat permissions into the communication policy:
    - Stage 1: allow only predefined quick chat messages from this prompt.
    - Stage 2 and Stage 3: if you later add custom/free-text chat endpoints, ensure they check `can_use_custom_text_chat` before sending.

Log key actions in `audit_logs`:

- `FRIEND_REQUEST_SENT`, `FRIEND_REQUEST_ACCEPTED`, `FRIEND_REMOVED`, `USER_BLOCKED`.  
- `QUICK_CHAT_MESSAGE_SENT` (aggregated if needed).

## 5. Deliverables

From this prompt, generate:

1. SQL schema additions for:
   - `friend_requests`, `friends`, `quick_chat_messages`, `quick_chat_events` (+ optional blocks).  
2. Player API handlers under:
   - `/api/app/friends/...` for friend management.  
   - `/api/app/quick-chat/...` for listing messages and sending quick chat events.  
3. Realtime design:
   - How to broadcast quick chat events to other players using Supabase Realtime or another provider.  
4. Validation and rate limiting:
   - Ensure only predefined messages are used.  
   - Protect against spam and abuse.  

Design everything so it integrates cleanly with the existing Supabase-based backend and respects current quiz and multiplayer session flows.
