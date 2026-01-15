# Player Quiz App – Groups & Group Chat Backend Prompt

Use this prompt in WebPrompts to add **groups, group membership, and group chat** (with predefined messages, emoticons, and chat filtering) to the existing quiz + friends + quick chat backend.

---

You are extending the **player-side backend** (Supabase + Node/Next APIs under `/api/app/...`) to support:

- Users sending **friend requests** to each other (already defined).  
- Users creating and joining **groups** (squads/teams).  
- Group admins/owners being able to:
  - Add members.
  - Remove/kick members.
  - Manage basic group settings.  
- **Group chat** using:
  - Predefined messages and **emoticons**.
  - Optional short text messages passed through a **chat filter**.  

The aim is to keep communication safe, lightweight, and suitable for a quiz game environment.

## 1. Data Model – Groups & Membership

Add tables for groups and membership on top of existing `profiles`, `friends`, etc.

### 1.1 Groups

- `groups`:
  - `id` uuid pk.
  - `name` text not null.
  - `description` text.
  - `owner_id` uuid references `profiles(id)` not null.
  - `icon` text null (URL or emoji).
  - `is_public` boolean not null default false.
  - `max_members` int not null default 20 (configurable).
  - `created_at` timestamptz default now().
  - `updated_at` timestamptz default now().
  - `is_active` boolean not null default true.

### 1.2 Group members

- `group_members`:
  - `id` uuid pk.
  - `group_id` uuid references `groups(id)` on delete cascade.
  - `user_id` uuid references `profiles(id)` on delete cascade.
  - `role` text not null check (role in ('owner','admin','member')).
  - `joined_at` timestamptz default now().
  - `is_muted` boolean not null default false (muted by group admin).
  - Unique constraint on `(group_id, user_id)`.

Rules:

- The `owner_id` must always be a member with role `owner`.  
- Owners can assign other members as `admin`.  
- Owners and admins can:
  - Invite members.
  - Kick members.
  - Mute/unmute members in group chat.

### 1.3 Group invitations (optional but recommended)

- `group_invitations`:
  - `id` uuid pk.
  - `group_id` uuid references `groups(id)`.
  - `from_user_id` uuid references `profiles(id)` not null.
  - `to_user_id` uuid references `profiles(id)` not null.
  - `status` text not null check (status in ('pending','accepted','rejected','cancelled')).
  - `created_at` timestamptz default now().
  - `responded_at` timestamptz.

Alternatively, groups can be joinable via invite codes, but invitations allow tighter control with friends.

## 2. Data Model – Group Chat (Predefined + Emoticons + Filtered Text)

You already have `quick_chat_messages` for predefined phrases. Extend it for group chat:

- `quick_chat_messages` additions:
  - `category` text not null default 'text' (e.g. 'text', 'emoticon', 'system').
  - Examples:
    - `key='GOOD', text='Good', category='text'`.
    - `key='EXCELLENT', text='Excellent!', category='text'`.
    - `key='WELL_PLAYED', text='Well played', category='text'`.
    - `key='EMOJI_CLAP', text='👏', category='emoticon'`.

Create a new table for **group chat messages**:

- `group_chat_messages`:
  - `id` uuid pk.
  - `group_id` uuid references `groups(id)` on delete cascade.
  - `from_user_id` uuid references `profiles(id)` not null.
  - `type` text not null check (type in ('quick','emoticon','text')).
  - `quick_chat_message_id` uuid references `quick_chat_messages(id)` null.
  - `text` text null (for filtered free-text if enabled).
  - `created_at` timestamptz default now().

Rules:

- For `type='quick'` or `type='emoticon'`, `quick_chat_message_id` must be not null and `text` null.  
- For `type='text'`, `text` must be not null and passed through chat filter.  
- Group chat should be primarily quick messages and emoticons; text is optional and heavily filtered.

## 3. Chat Filter Model

Add simple configuration tables for filtering:

- `chat_filter_rules`:
  - `id` uuid pk.
  - `pattern` text not null (e.g. a word or regex).
  - `action` text not null check (action in ('block','replace','flag')).
  - `replacement` text null (e.g. '***').
  - `is_active` boolean default true.
  - `created_at` timestamptz default now().

- Optional: `chat_filter_settings` in `app_settings`:
  - `chat_filter` key with JSON value like:
    - `{ "enabled": true, "max_message_length": 80, "max_messages_per_minute": 10 }`.

## 4. Group APIs (`/api/app/groups/...`)

Implement player endpoints for group management:

- `GET /api/app/groups`
  - Returns groups where current user is a member.

- `GET /api/app/groups/:groupId`
  - Returns group details and members (with roles).

- `POST /api/app/groups`
  - Body: `name`, `description`, optional `is_public`, `max_members`.
  - Creates a group with current user as `owner` and member with role `owner`.

- `POST /api/app/groups/:groupId/join`
  - For public groups or accepted invitations:
    - Check capacity and membership.
    - Add user as `member`.

- `POST /api/app/groups/:groupId/leave`
  - Removes current user from group.
  - If user is `owner`:
    - Either transfer ownership to another admin/member or restrict leaving until ownership transferred.

- `POST /api/app/groups/:groupId/invite`
  - Body: `to_user_id`.
  - Only `owner` or `admin`.
  - Creates `group_invitations` row.

- `GET /api/app/groups/invitations`
  - List incoming/outgoing invitations for current user.

- `POST /api/app/groups/invitations/:invitationId/accept`
  - Adds user to group as `member`, updates invitation status.

- `POST /api/app/groups/invitations/:invitationId/reject`

- `POST /api/app/groups/:groupId/members/:userId/kick`
  - Only `owner` or `admin`.
  - Removes the member from `group_members`.

- `POST /api/app/groups/:groupId/members/:userId/mute`
  - Only `owner` or `admin`.
  - Sets `is_muted=true`, used by group chat to block sending messages.

All endpoints:

- Use Supabase Auth session to get current user.  
- Enforce role-based permissions carefully.  
- Return clear error messages (not authorized, group full, already member, etc.).

Log relevant actions into `audit_logs`:

- `GROUP_CREATED`, `GROUP_MEMBER_ADDED`, `GROUP_MEMBER_REMOVED`, `GROUP_MEMBER_MUTED`, `GROUP_INVITE_SENT`, `GROUP_INVITE_ACCEPTED`.

## 5. Group Chat APIs (`/api/app/group-chat/...`)

Implement endpoints for group chat:

- `GET /api/app/group-chat/messages`
  - Query params: `group_id`, `before`, `limit`.
  - Returns recent `group_chat_messages` joined with:
    - Sender basic info (username/avatar).
    - Linked `quick_chat_messages` for quick/emoticon types.

- `POST /api/app/group-chat/send`
  - Body:
    - `group_id`.
    - `type` ('quick' | 'emoticon' | 'text').
    - For quick/emoticon: `quick_chat_message_id`.
    - For text: `text`.
  - Behavior:
    - Ensure:
      - User is member of group and not muted.  
      - Group is active.  
    - For quick/emoticon:
      - Validate `quick_chat_message_id` is active, category matches type.  
    - For text:
      - Apply chat filter:
        - Trim length to `max_message_length`.  
        - Apply patterns from `chat_filter_rules`:  
          - `block` → reject message.  
          - `replace` → perform replacements (e.g. mask bad words).  
          - `flag` → mark in metadata (optional).  
      - If blocked, return error and do not insert.
    - Insert row in `group_chat_messages`.
    - Trigger realtime broadcast to group channel (see below).

- `GET /api/app/quick-chat/messages` (reuse from previous prompt)
  - Can be used by both 1v1/match quick chat and group chat to render quick messages and emoticons.

## 6. Realtime Delivery Design

Use Supabase Realtime or another WebSocket provider to deliver group chat messages live.

Channel naming:

- `group_chat:{group_id}`

On insert into `group_chat_messages`, server or database trigger:

- Broadcast new message to `group_chat:{group_id}` channel with payload:
  - `message_id`, `group_id`, `from_user_id`, `type`, `quick_chat_message_id`, `text`, `created_at`.

Clients:

- Subscribe/unsubscribe on joining/leaving a group chat screen.  
- Map `quick_chat_message_id` to local text/emoticon for rendering.

## 7. Chat Filter & Admin Control

Integrate with admin portal:

- Admin can:
  - Manage `quick_chat_messages` (text + emoticons).  
  - Manage `chat_filter_rules` and enable/disable filter.  
  - Mute users globally or for chat (e.g. `profiles.chat_muted_until`).  

Backend:

- Implement chat filter logic in one central function called by all text chat endpoints.  
- Add rate limiting (e.g. per user, max X messages per minute) and return error if exceeded.

## 8. Deliverables

From this prompt, generate:

1. SQL schema additions for:
   - `groups`, `group_members`, `group_invitations`.  
   - `group_chat_messages`, `chat_filter_rules` (+ optional settings).  
2. Backend API handlers under:
   - `/api/app/groups/...` for managing groups and members.  
   - `/api/app/group-chat/...` for sending and retrieving messages.  
3. Realtime integration details for group chat:
   - Channel structure and subscription patterns.  
4. Chat filter implementation:
   - Pattern matching, actions (block/replace/flag), rate limiting.

Ensure:

- Group chat stays safe (no abusive free text).  
- Emoticons and predefined phrases are encouraged.  
- Group admins/owners can manage membership (including kicking and muting) safely.

