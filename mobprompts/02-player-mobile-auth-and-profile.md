# Player Quiz App – Mobile Auth & Profile Prompt

Use this prompt in MobPrompts to generate the **authentication and profile module** for the player‑facing React Native quiz app, fully integrated with Supabase and the shared backend.

---

You are an expert **React Native and Supabase Auth engineer** building the **Auth + Profile** experience for the player mobile app.  
This module:

- Uses **Supabase Auth** for login and registration.  
- Uses the shared `profiles` table and `/api/app/me` endpoints from the existing backend.  
- Integrates into the global navigation and app shell defined in the mobile architecture prompt.

## Context

The system has:

- `profiles` table for players (`id`, `email`, `username`, `is_blocked`, `coins_balance`, `lifetime_earned_coins`, etc.).  
- Supabase Auth `auth.users` for credential management.  
- Player APIs:
  - `GET /api/app/me` for profile and balances.  
  - `PUT /api/app/me` for updating allowed profile fields.  
  - `GET /api/app/settings` for global settings (coins → PKR, withdrawal thresholds, help flags).

The admin portal manages users from an admin perspective but is never used directly by players.

## Tech Stack

- React Native (TypeScript).  
- Supabase client for Auth on the device.  
- React Navigation Auth stack plus Main tabs.  
- React Query (or similar) for fetching `/api/app/me` and `/api/app/settings`.  
- Context provider for auth/session and profile data.

## Screens & Flows

Design the following screens and flows.

### 1. Splash / Session Check

- **SplashScreen**
  - On launch:
    - Check for an existing Supabase session/token.  
    - If a valid session exists:
      - Fetch `/api/app/me`.  
      - If the profile is valid and not blocked → navigate to Main tabs.  
      - If `is_blocked = true` → show blocked message and sign out.  
    - If no valid session → navigate to Auth stack.
  - Handle loading and error states cleanly.

### 2. Login & Registration

- **LoginScreen**
  - Email/password fields with validation.  
  - Uses Supabase Auth `signInWithPassword` (or equivalent) on submit.  
  - On success:
    - Ensure `profiles` row exists (backend can auto‑create if configured).  
    - Navigate to `SplashScreen` or directly to Main tabs after fetching `/api/app/me`.  
  - Show clear error messages for invalid credentials or network issues.

- **RegisterScreen**
  - Registration fields:
    - Email, password.  
    - Optional username on first step, or set later in Profile.  
  - Uses Supabase Auth `signUp`.  
  - After successful registration:
    - Ensure a `profiles` entry is created for the user.  
    - Navigate to Main tabs or to a username/setup screen.  
  - Handle email verification flow if backend enforces it.

### 3. Profile View & Edit

- **ProfileScreen**
  - Uses `GET /api/app/me` to display:
    - Username, email.  
    - `coins_balance` and `lifetime_earned_coins`.  
    - PKR equivalent of current coins using `coins_to_pkr`.  
    - Optional avatar URL.  
    - Optional communication stage (from communication policy endpoints).
  - Shows actions:
    - Edit username and avatar.  
    - Navigate to Wallet, Leaderboard, Settings, Help.

- **Profile Editing**
  - Uses `PUT /api/app/me`:
    - Update allowed fields (username, avatar URL, other non‑sensitive info).  
  - Validate inputs and show success/error states.

### 4. Settings & Logout

- **SettingsScreen**
  - Toggles for local preferences (notifications, sound, theme).  
  - Section showing:
    - App version.  
    - Link to Help/FAQ.  
  - Logout button:
    - Calls Supabase `signOut`.  
    - Clears local auth/profile state and navigates back to Auth stack.

### 5. Communication Stage & Policy (Read‑Only here)

- Integrate with communication policy module (read‑only in this prompt):
  - Fetch communication status from a dedicated `/api/app/...` endpoint when available.  
  - Show:
    - Current stage: preset chat, custom text, voice.  
    - Progress towards next stage (ads viewed or similar metric).  
  - Do not implement chat/voice here; just surface status and guidance.

## Error Handling & Edge Cases

Define behavior when:

- Supabase session expires while app is open:
  - Detect and send user to Auth stack gracefully.  
- `/api/app/me` returns an error:
  - Show retry with fallback to sign out if token is invalid.  
- `is_blocked = true`:
  - Prevent access to main app; show informative message and sign out option.

## Deliverables

From this prompt, generate:

1. A React Native Auth stack design (components, navigation, and state).  
2. Screen responsibilities and UX flows for Splash, Login, Register, Profile, and Settings.  
3. Example API interaction patterns with Supabase Auth and `/api/app/me`.  
4. Error and edge case handling strategies, especially around session expiry and blocked users.  
5. Integration notes showing how this module plugs into the global mobile architecture (Main tabs, Wallet, Leaderboard, Quiz, and future chat/voice modules).

