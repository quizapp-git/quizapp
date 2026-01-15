# Player Quiz App – Mobile Notifications & Reminders Prompt

Use this prompt in MobPrompts to generate the **notifications and reminders system** for the player‑facing React Native quiz app, consistent with the existing backend and business rules.

---

You are an expert **mobile notifications and engagement engineer** designing how the app:

- Uses push and in‑app notifications to bring players back.  
- Reminds them of quizzes, payouts, and communication unlock milestones.  
- Respects user consent, platform policies, and local privacy regulations.

## Context

The app:

- Already has quiz, wallet, leaderboards, friends, groups, and communication policy modules.  
- Tracks ad impressions, quiz sessions, earnings, and payouts.  
- Has admin‑side analytics and reporting for behavior and revenue.

You are designing a notification system that:

- Integrates with mobile OS push services and optional backend schedulers.  
- Also includes in‑app reminders for users who decline or disable push.

## Tech & Integration

- React Native (TypeScript).  
- For push:
  - FCM/APNs directly or via a provider (e.g. Expo Notifications, OneSignal).  
  - A device token registration endpoint (e.g. `/api/app/notifications/register-device`).  
- Backend integrations:
  - Optional `/api/app/notifications/preferences`.  
  - Backend cron or job system triggers notifications based on:
    - Inactivity.  
    - Payout eligibility.  
    - Communication stage milestones.

## UX & Flows

### 1. Permission Request & Preferences

- **Permission Prompt Flow**
  - Do not prompt for push permission immediately on first launch.  
  - After user has some engagement (e.g. first quiz completed), show an in‑app explanation:
    - Why notifications are useful (reminders for new quizzes, payouts, milestones).  
    - Option to enable or skip.  
  - If user chooses to enable:
    - Trigger OS‑level notification permission dialog.  
    - On success, register device token with backend.

- **Notification Settings Screen**
  - Integrated into Settings or a dedicated Notifications screen.  
  - Shows toggles for:
    - Quiz reminders.  
    - Payout reminders.  
    - Social notifications (friends/groups).  
  - Uses `/api/app/notifications/preferences` to save preferences when available.

### 2. Notification Types

Define user‑visible categories:

- **Quiz Reminders**
  - Encourage user to play quizzes if inactive for a while.  
  - Example: “New quizzes are live – play now to earn more coins.”

- **Payout & Wallet**
  - Remind users when:
    - They reach or exceed the withdrawal threshold.  
    - A payout request changes status (approved, paid, rejected).

- **Social & Communication**
  - Friend requests received or accepted.  
  - Group invitations.  
  - Voice session invites (if allowed by policy).  

Ensure content is:

- Short, clear, and non‑misleading.  
- Tied to real backend state to avoid confusing or stale notifications.

### 3. In‑App Reminders

Design non‑push reminders:

- In‑app banners or cards on Home/Profile/Wallet for:
  - Reaching payout threshold.  
  - Having pending friend requests or group invites.  
  - Being close to communication stage upgrade.

These should:

- Respect user preference toggles where applicable.  
- Be easily dismissible and not overwhelm the UI.

## Delivery & Scheduling

Describe backend strategies (conceptual):

- Inactivity reminders:
  - Simple rules like “no quiz sessions in X days”.  
  - Admin‑configurable quiet hours or frequency caps.

- Payout and social events:
  - Triggered by status changes or new invitations.  

Include:

- Idempotency rules so users are not spammed with duplicate notifications.  
- Time zone handling where relevant.

## Privacy, Consent & Compliance

Ensure design:

- Complies with platform policies (Android, iOS) and local laws.  
- Provides clear opt‑in and opt‑out controls.  
- Does not expose sensitive financial information in notification content.

## Deliverables

From this prompt, generate:

1. A React Native notification permission and preference flow.  
2. Notification categories, sample messages, and mapping to user events.  
3. In‑app reminder UX integrated into Home, Wallet, and Social areas.  
4. Conceptual backend scheduling rules compatible with admin reporting and analytics.  
5. Privacy‑aware guidelines for notification content and frequency.

