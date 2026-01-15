# Player Quiz App – Groups & Group Chat UI Prompt

Use this prompt in WebPrompts to build **group management and group chat UI** in the React Native player app, including admin controls (kick, mute), chat filtering UX, and emoticons.

---

You are extending the **React Native quiz app** to support:

- User-created **groups** (teams/squads).  
- Group membership and invitations.  
- Group admins/owners who can:
  - Invite members.
  - Kick/remove members.
  - Mute members in group chat.  
- **Group chat** with:
  - Predefined quick messages.
  - Emoticons.
  - Optional short text messages that are filtered.  

The backend provides:

- `/api/app/groups/...` and `/api/app/group-chat/...` APIs as designed in the previous prompt.  
- `/api/app/quick-chat/messages` for reusable quick messages/emoticons.  
- Realtime channels like `group_chat:{group_id}` for live updates.

## 1. Navigation & Screens – Groups

Add a **Groups** section to the app (could be a tab or accessible from Friends/Profile).

### 1.1 Groups list

- **GroupsScreen**
  - Shows:
    - “My Groups” – groups the current user belongs to.  
  - Each item:
    - Group name, icon, member count, whether user is owner/admin/member.  
  - Actions:
    - Tap to open `GroupDetailScreen`.  
    - “Create Group” button to open `CreateGroupScreen`.

### 1.2 Create/Join groups

- **CreateGroupScreen**
  - Form:
    - Group name (required).  
    - Description (optional).  
    - Is public toggle.  
    - Max members (with reasonable default and limits).  
  - On submit:
    - Calls `POST /api/app/groups`.  
    - Navigates to group detail on success.

- **GroupInvitationsScreen**
  - Shows:
    - Incoming invitations with Accept/Reject.  
    - Outgoing invitations.  
  - Uses `/api/app/groups/invitations`.

Within `GroupDetailScreen` (below) provide UI to:

- Invite friends to group.  
- Join public groups (if you design a discovery flow).

### 1.3 Group detail & member management

- **GroupDetailScreen**
  - Header:
    - Group name, description, icon.  
    - “Leave group” button.
  - Tabs or sections:
    - Members.  
    - Chat.

- Members section:
  - List of `group_members` with:
    - Username, avatar, role (owner/admin/member).  
    - Mute badge if muted.  
  - If current user is **owner/admin**:
    - Actions on each member:
      - “Make admin” (if allowed).  
      - “Remove/Kick” from group.  
      - “Mute/Unmute in chat”.  
    - Button “Invite friend”:
      - Opens a dialog listing the user’s friends to invite (calls `/groups/:groupId/invite`).

Member list should show current user clearly, and show if the group is full.

## 2. Group Chat UI

Within `GroupDetailScreen`, add a **Chat** tab/panel:

- **GroupChatPanel**
  - Uses `/api/app/group-chat/messages` to load history.  
  - Subscribes to `group_chat:{group_id}` realtime channel for new messages.  

Layout:

- Messages list:
  - Bubble-style messages showing:
    - Sender name (or “You”).  
    - Message text or emoticon.  
    - Time.  
  - Different styles for:
    - Quick messages.  
    - Emoticons (larger icons).  
    - Filtered text messages.

- Input area:
  - For quick/emoticon chat:
    - A small **Quick Chat / Emoticons bar**:
      - Horizontal list of commonly used quick messages and emojis (from `/quick-chat/messages`).
      - On tap: send that quick message (type `quick` or `emoticon`) via `/group-chat/send`.
  - For text chat (if enabled):
    - A simple text input field and send button.
    - Client-side checks:
      - Max length (align with backend).  
      - Optionally show when message is blocked/modified by the filter.

### 2.1 Handling chat filter feedback

When sending a **text** message:

- If backend:
  - Accepts but replaces content (due to `replace` rules):
    - Show final server message in chat.  
  - Blocks (due to `block` rules):
    - Show a local error or toast:  
      - “Message contains blocked words and was not sent.”  
  - Flags (optional):
    - No UI change necessary; used for moderation.

### 2.2 Muted users and group admin actions

- If the current user is muted in this group:
  - Disable input/quick chat buttons.  
  - Show a small notice: “You have been muted by a group admin.”

- If user is kicked from group while in chat:
  - On receiving a server error or membership change:
    - Show a message “You have been removed from this group.”  
    - Redirect to Groups list.

## 3. Hooks & State Management

Implement React hooks for groups and group chat:

- `useGroups()`:
  - Fetches `/api/app/groups`.  
  - Exposes:
    - `groups`, `isLoading`, `error`, `refresh`.  

- `useGroup(groupId)`:
  - Fetches group detail and members.  
  - Exposes helper actions:
    - `leaveGroup`, `inviteFriend`, `kickMember`, `muteMember`, etc.

- `useGroupInvitations()`:
  - Wraps `/groups/invitations` and actions `acceptInvitation`, `rejectInvitation`.

- `useGroupChat(groupId)`:
  - Manages:
    - Loading history (`/group-chat/messages`).  
    - Connecting to realtime channel `group_chat:{group_id}`.  
    - State of messages (append on new event).  
    - `sendQuickMessage`, `sendEmoticon`, `sendTextMessage`.

- `useQuickChatMessages()`:
  - Shared hook to load quick chat messages and emoticons from `/quick-chat/messages`.

## 4. Emoticons

Use `quick_chat_messages` entries with `category='emoticon'`:

- Represent them as large emoji buttons/icons in:
  - Group chat panel.  
  - Optional other screens (1v1 quick chat, lobby).

Ensure:

- Emoticons are:
  - Easy to tap.  
  - Limited in count on screen (use “More” list if needed).

## 5. UX & Safety

Design UX to:

- Encourage positive interactions:
  - Default quick messages: “Good”, “Excellent”, “Well played”, “Nice try”.  
  - Emphasize emoticons and short reactions more than free text.
- Avoid spam:
  - Client-side throttling (cooldown) for repeated sends.  
  - Show a warning if user tries to send too fast.
- Respect roles:
  - Only show admin actions (kick/mute) if user is owner/admin.

## 6. Deliverables

From this prompt, generate:

- React Native components and navigation updates for:
  - Groups list, group detail, create group, invitations.  
  - Group chat panel with quick messages, emoticons, and optional text input.  
- Hooks for groups and group chat.  
- Example code for:
  - Calling `/api/app/groups/...` and `/api/app/group-chat/...`.  
  - Subscribing to and handling realtime group chat events.

Ensure group and chat features integrate smoothly with:

- Existing friends system.  
- Existing quiz gameplay, wallet, and voice chat features.  
- The overall visual style and UX of the app.

