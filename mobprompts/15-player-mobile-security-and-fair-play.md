# Player Quiz App – Mobile Security & Fair Play Prompt

Use this prompt in MobPrompts to generate the **security and fair play strategy** for the player‑facing React Native quiz app.

---

You are an expert **mobile security and anti‑abuse engineer** designing protections so that:

- Players cannot easily cheat quiz results or ad impressions.  
- Payouts are not abused or manipulated.  
- Communication features are used safely.

## Context

The system:

- Uses Supabase and `/api/app/...` backend enforcing business rules server‑side.  
- Tracks quiz sessions, ad impressions, coin transactions, and payouts.  
- Has admin‑side audit logs and dashboards.

You must design client‑side practices that complement server‑side checks, understanding that:

- Client can be tampered with, so security must not rely solely on the app.  
- Fair play protections are a combination of client + server measures.

## Threat Model

Consider threats like:

- Tampering with quiz answers or score submissions.  
- Faking or inflating ad impressions.  
- Automating quiz play or using bots.  
- Creating multiple accounts to exploit referrals or payouts.  
- Abusing chat and voice to harass others.

## Client‑Side Practices

Define:

- How to:
  - Avoid exposing sensitive business logic in the client (e.g. reward calculations).  
  - Never store secrets or service keys in the app bundle.  
  - Minimize sensitive data stored on device.

- Obfuscation and integrity:
  - Use code obfuscation/minification appropriate for React Native builds.  
  - Detect rooted/jailbroken devices if desired and handle gracefully (conceptual).

## Server‑Side Coordination (Conceptual)

Describe server‑side checks that the client design must assume:

- Quiz:
  - Validate answers and compute rewards server‑side only.  
  - Ensure `complete` endpoints check consistency and prevent resubmission of same session for extra rewards.

- Ads:
  - Require valid session and quiz context for ad impression logging.  
  - Enforce one impression per question index per session.  
  - Correlate with provider‑reported aggregates.

- Payouts:
  - Verify identity and coins balance on each request.  
  - Rate‑limit payout requests.  
  - Use `audit_logs` to track suspicious patterns.

- Communication:
  - Apply moderation and abuse controls (outside this prompt but acknowledged).

## UX & Transparency

Ensure:

- Security/friction is balanced with user experience.  
- Explanations for:
  - Why some actions may be limited (suspicious activity, device issues).  
  - Why certain payouts require additional checks.

## Deliverables

From this prompt, generate:

1. A list of client‑side security best practices for the React Native app.  
2. Recommended patterns for coordinating with server‑side anti‑cheat and abuse detection.  
3. Guidance on handling suspicious situations in the UI (account flags, payout holds) without revealing internal detection logic.  
4. Suggestions for logging and monitoring that feed into admin audit and AI insight prompts.  
5. Overall principles to keep the game fair and the ecosystem sustainable.

