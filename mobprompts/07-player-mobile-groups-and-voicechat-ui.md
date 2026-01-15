# Player Quiz App – Mobile Groups & Voice Chat UI Prompt

Use this prompt in MobPrompts to generate the **Groups and Voice Chat UI** for the player‑facing React Native quiz app, using the existing backend design for groups and voice rooms.

---

You are an expert **real‑time communication and mobile UX engineer** implementing the **Groups** and **Voice Chat** experience in the player app.  
This module focuses on **UI and client integration** and assumes backend logic exists (or is defined) for:

- Groups and group membership.  
- Group chat (text).  
- Voice rooms with a third‑party real‑time audio provider.

## Context

From backend prompts:

- There are tables and `/api/app/...` endpoints for:
  - Group creation, membership, and invitations.  
  - Group text chat in group channels.  
  - Voice rooms:
    - `voice_rooms` and `voice_room_participants`.  
    - `/api/app/voice/create-room`, `/join-room`, `/leave-room`.  
    - Backend generates short‑lived tokens for a voice provider (e.g. Agora, Twilio).
- Communication policies control who can create or join voice rooms, based on ads viewed and stages.

This prompt is focused on React Native client behavior.

## Tech Stack

- React Native (TypeScript).  
- React Navigation stack for Groups & Voice.  
- React Query for group and voice endpoints.  
- Voice SDK for real‑time audio with a thin abstraction layer:
  - `VoiceService` interface:
    - `joinChannel({ provider, channelName, token, userId })`.  
    - `leaveChannel()`.  
    - `muteLocalAudio(boolean)`.  
    - Event callbacks for participant updates and active speaker.

## Screens & Flows

### 1. Groups Overview

- **GroupsListScreen**
  - Shows:
    - List of groups user belongs to.  
    - Basic info: group name, member count, last activity.  
  - Actions:
    - Create new group.  
    - Join group via invite or code (if supported).

- **GroupDetailScreen**
  - Shows:
    - Member list.  
    - Recent group messages (text).  
  - Actions:
    - Send text messages (if policy allows).  
    - Open group voice room (if allowed) or join an existing one.

### 2. Voice Rooms UI

- **VoiceRoomScreen**
  - Triggered when user joins or creates a voice room for a group or multiplayer quiz.  
  - Inputs:
    - `voice_room_id`, provider, `channel_name`, `token`, `expires_at`.  
  - On enter:
    - Calls `VoiceService.joinChannel(...)`.  
    - Shows:
      - List of participants.  
      - Mute/unmute toggle for the local user.  
      - Optional active speaker indicator.  
  - Actions:
    - Mute/unmute.  
    - Leave voice room (calls `/api/app/voice/leave-room` and `VoiceService.leaveChannel()`).
  - Lifecycle:
    - Leave voice room when:
      - User presses “Leave Voice”.  
      - User leaves group screen.  
      - App goes to background (configurable behavior).

### 3. Integration with Quiz Sessions

Describe how voice can be used while playing quizzes:

- In a multiplayer quiz or group play mode:
  - Display a small voice control bar inside `QuizPlayScreen`:  
    - Show join/leave voice controls.  
    - Show mute toggle and participant count.  
  - Ensure:
    - Voice continues or pauses appropriately when an interstitial ad is shown, based on provider best practices.  
    - Voice does not interfere with quiz answer inputs.

### 4. Communication Policy & Permissions

The UI must:

- Check communication stage and permissions (voice enabled) using a policy endpoint.  
- Only show “Join Voice” or “Create Voice Room” when:
  - User is at the required stage (e.g. Stage 3: voice unlocked).  
  - Group/quiz context allows voice.  
- Otherwise:
  - Show locked state with information about how to unlock voice (number of ads, etc., as provided by backend).  
  - Do not attempt to obtain tokens or connect to voice provider.

## Error Handling & UX Considerations

Define behavior when:

- `create-room` or `join-room` APIs fail:
  - Show error and allow retry.  
- Voice SDK connection fails:
  - Show clear status and retry option.  
- Tokens expire:
  - Handle graceful reconnection or require rejoin via backend.  
- Network is poor:
  - Show network/quality indicator and allow user to disable voice to save bandwidth.

Ensure:

- No call recording is initiated on the client by default.  
- UI reminds users that conversations may be moderated or not private, as per policy.  
- Voice integration does not break the AdMob rule (1 ad after each question, up to 10 per session).

## Deliverables

From this prompt, generate:

1. A React Native design for Groups list, Group detail, and Voice room screens.  
2. Integration patterns between these screens and `/api/app/voice/...` as well as group APIs.  
3. A `VoiceService` abstraction and example usage with a provider SDK.  
4. UX patterns for using voice chat during quizzes without interfering with ads and gameplay.  
5. Communication policy‑aware UI behavior for locking/unlocking voice features.

