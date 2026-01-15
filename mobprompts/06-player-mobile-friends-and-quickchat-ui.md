# Player Quiz App – Mobile Friends & Quick Chat UI Prompt

Use this prompt in MobPrompts to generate the **Friends and Quick Chat UI** for the player‑facing React Native quiz app, built on top of existing backend prompts for friends and chat.

---

You are an expert **social features and mobile UX engineer** implementing the **Friends** list and **Quick Chat** experience in the player app.  
This module focuses on **UI and flows** and assumes backend logic exists (or is defined) in separate prompts for:

- Friends relationships and requests.  
- Predefined quick chat messages.  
- Optional custom text chat rules.

## Context

From backend prompts (friends/quick chat):

- There are tables and APIs for:
  - Friend relationships (pending, accepted, blocked).  
  - Friend requests.  
  - Predefined quick chat phrases.  
  - Optional custom text messages depending on communication stage.  
- Communication stages are controlled by ads viewed and other policy rules.

This prompt is **mobile‑UI‑only** and must:

- Consume existing `/api/app/...` endpoints for friends and chat.  
- Respect communication policy:
  - Stage 1: Predefined quick chat only.  
  - Stage 2: Custom text chat unlocked.  
  - Stage 3: Voice chat unlocked (handled by another module).

## Tech Stack

- React Native (TypeScript) within Profile or a dedicated Social/Friends area.  
- React Navigation stack for Friends & Chat screens.  
- React Query for data fetching.  
- State management for active chats and unread messages.

## Screens & Flows

### 1. Friends List & Requests

- **FriendsListScreen**
  - Shows:
    - List of current friends with username, avatar, online/last‑seen indicator (if available).  
  - Actions:
    - Tap to open chat with a friend.  
    - Button to open friend search/add.

- **FriendRequestsScreen**
  - Shows incoming/outgoing friend requests.  
  - Actions:
    - Accept, reject, cancel.  
  - Uses corresponding `/api/app/friends/...` endpoints.

- **FriendSearchScreen**
  - Allows searching by username or ID.  
  - Shows results and “Add Friend” actions.

### 2. Quick Chat UI

- **QuickChatScreen**
  - Per‑friend or per‑room conversation view.  
  - If user is in **Stage 1 (quick chat only)**:
    - Show only predefined quick chat phrases as buttons (e.g. “Good luck!”, “Nice one!”, “BRB”).  
    - Tapping a phrase sends it via backend chat endpoint.  
    - Show chat history with indication that messages are from quick chat presets.
  - If user’s stage allows custom text:
    - Show a text input field in addition to quick chat buttons.  
    - Respect server‑side validation and filtering of text messages.

### 3. Integration with Quiz Flow

Describe how Quick Chat can optionally appear:

- In multiplayer quiz contexts or rooms:  
  - Accessible from `QuizPlayScreen` via a small chat icon.  
  - Opens a chat drawer or overlay while quiz continues.  
  - Respects ads flow (UI should pause chat interaction while an interstitial ad is visible if needed).

### 4. Communication Policy Awareness

The UI must:

- Read user’s communication stage from a policy endpoint.  
- Reflect stage visually:
  - Locked icons for custom text and voice.  
  - Label showing what is unlocked (quick chat only, etc.).  
- Explain how to unlock next stage (e.g. “Watch X more ads to unlock custom chat”) without exposing internal counters beyond what backend provides.

## Error Handling & UX Considerations

Define behavior when:

- Friend APIs fail:
  - Show retry and non‑blocking messaging.  
- Chat send fails:
  - Indicate unsent state and allow retry.  
- User drops from higher stage back to lower stage (if policy supports it):
  - UI adapts gracefully, hiding or disabling custom text input where required.

## Deliverables

From this prompt, generate:

1. A React Native design for Friends list, Friend requests, Friend search, and Quick Chat screens.  
2. Navigation structure for integrating these screens into the main app (Profile or separate Social tab).  
3. UI patterns that reflect communication stages and quick chat vs custom text capabilities.  
4. Example interaction patterns with `/api/app/friends/...` and `/api/app/chat/...` endpoints.  
5. UX guidance for using Quick Chat during quiz sessions without interfering with ads and core gameplay.

