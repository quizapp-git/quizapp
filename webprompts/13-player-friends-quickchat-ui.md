# Player Quiz App – Friends & In-Game Quick Chat UI Prompt

Use this prompt in WebPrompts to build the **friend system UI and in-game predefined message chat** in the React Native player app.

---

You are extending the **React Native quiz app** to let users:

- Add each other as **friends**.  
- See friend lists and friend requests.  
- During a game, send **predefined quick chat messages** such as:
  - “Good”
  - “Excellent”
  - “Well played”
  - Other short positive/emote-style phrases.
- Only these predefined messages are allowed for users in Stage 1 of the communication policy; higher stages can optionally add custom/free-text chat, but the UI must respect the policy (Stage 1 preset only, Stage 2 custom text, Stage 3 voice).

Also see:
- The **Chat & Voice Access Policy Based on Ads Viewed** prompt for how communication stages are derived from ads viewed.
- The **AdMob & Mobile Ad Providers Integration Module** prompt for how ad impressions are managed underneath this policy.

The app already has:

- Auth, quiz gameplay (up to 10 questions, 1 AdMob ad after each question).  
- Wallet, payouts, leaderboards.  
- Backend APIs under `/api/app/...` (to be extended with friends and quick chat as per previous prompt).  
- Optional voice chat and multiplayer rooms.

## 1. Navigation & Screens

Update the main navigation to include **Friends** and integrate quick chat into game screens.

### 1.1 Friends screens

- **FriendsScreen**
  - Tab or menu entry under main app.
  - Sections:
    - “My Friends”: list of current friends.
    - “Requests”: entry to friend requests screen.
  - For each friend:
    - Show username, avatar (if available), and basic status (online/offline if supported).
    - Actions:
      - View profile (optional).
      - Remove friend.

- **FriendRequestsScreen**
  - Shows:
    - Incoming friend requests (with Accept/Reject buttons).
    - Outgoing pending requests.
  - Pulls data from `/api/app/friends/requests`.

- **AddFriendScreen** (or inline in FriendsScreen)
  - Search or input:
    - Username or email (depending on backend support).
  - “Send request” button that calls `/api/app/friends/request`.
  - Show clear success or error messages.

### 1.2 Profile integration

- On **ProfileScreen**, add:
  - A button “Add Friend” when viewing another user’s profile (if implemented).
  - Status indicators if the user is already a friend or has a pending request.

## 2. In-Game Quick Chat UI

### 2.0 Communication stages overview (UI perspective)

Design the UI so it reacts to the player’s communication stage:

- Stage 1 – Preset only:
  - Show only the predefined quick chat panel; hide any free-text input boxes.
- Stage 2 – Custom text:
  - Show both the quick chat panel and a text input (when custom chat is implemented).
  - Clearly indicate that players can now type their own short messages.
- Stage 3 – Voice enabled:
  - Same text behavior as Stage 2.
  - Additionally show voice join/leave controls (see section 2.3) for eligible users.

Integrate quick chat into the **quiz gameplay** screens (e.g. `QuizPlayScreen`) especially for:

- Multiplayer sessions, 1v1 games, or rooms where multiple players participate.

### 2.1 Quick chat panel

- In `QuizPlayScreen` (or multiplayer variant):
  - Add a **Quick Chat button** (icon) visible during the game:
    - On tap, opens a small panel or bottom sheet with predefined messages.
  - The panel:
    - Shows a grid or list of buttons for each message returned from `/api/app/quick-chat/messages`, e.g.:
      - Good
      - Excellent
      - Well played
      - Nice try
      - etc.
    - Each button immediately sends that message to:
      - Opponent(s) in the current session/room.

- Sending behavior:
  - On press:
    - Call `/api/app/quick-chat/send` with:
      - `quick_chat_message_id`.
      - Relevant context (session, room).
    - Optionally optimistically show it locally while awaiting confirmation.

### 2.2 Displaying received quick messages

- Subscribe to the chosen realtime mechanism (Supabase Realtime or other) using the agreed channel naming (e.g. `quick_chat:session:{session_id}`).
- When a quick chat event is received:
  - Show a **small chat bubble** or toast near:
    - The user’s avatar or name for the sender.
  - Show only the predefined text from local mapping.
  - Optionally also show in a small scrollable “chat strip” for the last few messages.

Constraints:

- Messages are short and positive; do not implement free-text typing.  
- Limit how many messages can be displayed at once to avoid clutter.

### 2.3 Integration with voice, communication stages, and ads

- If voice chat is enabled:
  - Quick chat works alongside voice; it is mainly for fun/emotes.  
  - Show voice join controls only for users who have unlocked the voice-enabled communication stage, and show locked messaging for others.
- When an AdMob interstitial ad displays:
  - Temporarily hide quick chat panel and UI.  
  - Resume after ad finishes.  
- Make sure quick chat controls do not obstruct:
  - Answer buttons.  
  - Important quiz info.

## 3. Friends & Quick Chat Data Flow

Use React Query (or similar) + Context for state:

- **Friends context/hooks**:
  - `useFriends()`:
    - Fetches `/api/app/friends` and `/friends/requests`.  
    - Exposes lists and helpers to refresh.
  - Actions:
    - `sendFriendRequest`, `acceptFriendRequest`, `rejectFriendRequest`, `removeFriend`, `blockUser`.

- **Quick chat hooks**:
  - `useQuickChatMessages()`:
    - Fetches `/api/app/quick-chat/messages` once and caches.
  - `useQuickChatSession(sessionId or roomId)`:
    - Handles:
      - Subscribing/unsubscribing to realtime channel.  
      - Sending messages via `/quick-chat/send`.  
      - Local state for recent events.

## 4. UX & Safety

Design UX with:

- Clear feedback:
  - Success/error toasts for friend actions and quick chat sends.
  - Loading states when fetching friends/messages.
- Subtle moderation controls (client-side):
  - Optional per-session cooldown (e.g. user cannot send more than X quick messages in Y seconds).
  - If backend returns “muted”/“blocked” flags, disable quick chat controls with explanation.

## 5. Deliverables

From this prompt, generate:

- React Native screen components for:
  - Friends list, friend requests, add friend.  
  - In-game quick chat panel and message display.  
- Navigation updates to add Friends section.  
- Hooks and context for:
  - Friend data and actions.  
  - Quick chat messages and realtime events.  
- Example code showing:
  - How to call the friends and quick chat APIs.  
  - How to subscribe to quick chat events and render them nicely during the game.

Ensure the design:

- Keeps the quiz + AdMob flow as the primary experience.  
- Uses quick chat as light, positive interaction (good, excellent, well played, etc.).  
- Does not introduce free-text or unmoderated communication.
