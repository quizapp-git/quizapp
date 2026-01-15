# Player Quiz App – Real-Time Voice Chat Integration Prompt

Use this prompt in WebPrompts to add **real-time voice chat during quiz games** in the player app, integrated with the existing backend and quiz session flow.

---

You are extending the **user-facing quiz app** (React Native + Supabase backend) to support **voice chat between players while playing quizzes**.

Also see:
- The **Chat & Voice Access Policy Based on Ads Viewed** prompt for the three communication stages (preset text, custom text, voice) and how many ads a user must watch to unlock voice chat.
- The **AdMob & Mobile Ad Providers Integration Module** prompt for how ad impressions are tracked and exposed to the communication policy.

## Context

- Existing system:
  - Admin portal (PERN + Supabase + Vercel) managing quizzes, revenue, users, coins, payouts, AdMob, etc.
  - Player app (React Native) using `/api/app/...` for:
    - Auth & profile.
    - Quiz discovery and sessions (up to 10 questions, 1 AdMob ad after each question).
    - Wallet, payouts, leaderboards.
- You now need **real-time in-game voice chat** so users can talk during quiz sessions.

## Voice Chat Requirements

Design and integrate voice chat with the following behavior:

1. **Scope of chat**
   - Voice chat should be enabled **within a quiz session**:
     - For group quizzes or rooms where multiple users play the same quiz together.
   - Each quiz session/room has a **voice channel**.
   - Users in the same room can:
     - Join/leave voice channel.
     - Mute/unmute themselves.

2. **Technology**
   - Use a **real-time voice communication SDK** appropriate for mobile apps, such as:
     - Agora, Twilio, Daily, or WebRTC-based service.
   - Do not hard-code one vendor; instead:
     - Design an abstraction so the app can swap voice providers later.
     - Backend generates **temporary tokens**/credentials for a given room and user.

3. **Backend Responsibilities**

Extend the backend (Supabase + Node/Next) with:

- Tables (if needed):
  - `voice_rooms`:
    - `id` uuid pk.
    - `quiz_id` uuid references `quizzes(id)` null.
    - `room_code` text unique (used for user-friendly joining).
    - `is_active` boolean.
    - `created_at` timestamptz.
  - `voice_room_participants` (optional for logging):
    - `id` uuid pk.
    - `voice_room_id` uuid references `voice_rooms(id)`.
    - `user_id` uuid references `profiles(id)`.
    - `joined_at` timestamptz.
    - `left_at` timestamptz.

- API endpoints under `/api/app/voice/...`:

  - `POST /api/app/voice/create-room`
    - Input: `quiz_id` (optional), maybe a game mode flag.
    - Auth: current user.
    - Behavior:
      - Create a `voice_rooms` entry with a unique `room_code`.
      - Optionally link to an active quiz session.
      - Return:
        - `voice_room_id`, `room_code`.
    - Use case: host creates a room and invites others.

  - `POST /api/app/voice/join-room`
    - Input: `voice_room_id` or `room_code`.
    - Behavior:
      - Check room is active.
      - Add participant to `voice_room_participants`.
      - Generate a **voice SDK token** (via provider’s REST API or server SDK) for this user and room:
        - Token/credentials include:
          - Channel/room name.
          - User id.
          - Expiry time.
      - Return:
        - `voice_room_id`, `provider`, `channel_name`, `token`, `expires_at`, and any metadata needed by the client SDK.

  - `POST /api/app/voice/leave-room`
    - Input: `voice_room_id`.
    - Behavior:
      - Mark `left_at` for this user in `voice_room_participants`.
      - Optionally mark room inactive when last user leaves.

  - Optional moderation endpoints for future:
    - `POST /api/admin/voice/disable-room`
    - `GET /api/admin/voice/rooms` for monitoring.

4. **Mobile App Integration (React Native)**

Extend the React Native app with:

- New **Voice Chat module**:
  - Abstraction layer:
    - `VoiceService` interface with methods:
      - `joinChannel({ provider, channelName, token, userId })`.
      - `leaveChannel()`.
      - `muteLocalAudio(bool)`.
      - `onParticipantChange` / event callbacks.
  - Implementation for one provider (e.g. Agora or Twilio), but design so multiple providers can be plugged in.

- UI changes in **QuizPlayScreen**:
  - If quiz is played in a **multiplayer room**:
    - Show a **Voice Chat control bar**:
      - Button to **Join Voice** (calls `/voice/join-room` then connects via SDK).
      - Button to **Leave Voice**.
      - Mute/unmute toggle.
      - Indicator of number of participants connected.
  - Ensure voice channel lifecycle:
    - Join voice when user taps join, and leave when:
      - User ends quiz, or
      - User manually leaves the voice room, or
      - App goes to background (configurable).

- Additional screens or flows:
  - Optionally a **Lobby/Room screen** where:
    - Host creates room and shares code.
    - Others join via room code before starting quiz.

5. **Performance & UX Considerations**

Ensure:

- Voice chat runs **in parallel** with quiz and AdMob ads:
  - When an interstitial ad shows, voice may be temporarily muted or continue quietly depending on OS behavior and provider’s recommendations.
- Provide clear indicators:
  - Who is speaking (basic active speaker indicator if supported).
  - Mute status.
- Handle poor network:
  - Show network/quality indicator for voice.
  - Allow user to disable voice chat to save bandwidth.

6. **Security, Privacy & Communication Policy**

- Backend:
  - Generate **short-lived voice tokens** with minimal privileges.
  - Log room creation and join/leave events for moderation in `audit_logs` (e.g. `VOICE_ROOM_CREATED`, `VOICE_ROOM_JOINED`, `VOICE_ROOM_LEFT`, `VOICE_ROOM_DISABLED`).
  - Enforce the communication policy:
    - Only users in the highest communication stage (voice enabled, e.g. 500+ ads viewed) can create voice rooms or join voice channels.
    - Use a shared communication status helper/endpoint to check the user’s stage before issuing tokens.
- Client:
  - No call recording by default.
  - Provide UI reminder that conversations are not private when applicable.
  - Respect communication status:
    - Show voice join controls only when the user’s stage allows voice chat.
    - Otherwise show a locked state with information about how many more ads are required to unlock voice.

## Deliverables

From this prompt, generate:

1. Backend schema additions (`voice_rooms`, `voice_room_participants`) and endpoints under `/api/app/voice/...`, including checks against the communication stage before creating or joining rooms.  
2. Integration stubs with a generic real-time voice provider:
   - Server-side token generation interface.  
   - Configuration via environment variables (API keys, app ids) without exposing them to the client.  
3. React Native client integration:
   - `VoiceService` abstraction.  
   - Example implementation for one provider.  
   - UI changes in quiz flow to support joining/using voice chat, only when the user’s communication stage allows voice.  

Design the solution so it:

- Fits naturally with the existing quiz session model.  
- Does not interfere with AdMob ad flow (1 ad per question, max 10).  
- Can be gradually rolled out (e.g. voice chat only for certain quizzes or rooms at first, or only for users who have unlocked the voice-enabled communication stage).
