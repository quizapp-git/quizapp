# Player Quiz App – Mobile Wallet, Earnings & Payouts Prompt

Use this prompt in MobPrompts to generate the **wallet, earnings, and payout experience** for the player‑facing React Native quiz app, powered by the existing Supabase schema and `/api/app/...` backend.

---

You are an expert **fintech and mobile UX engineer** designing the **Wallet** section of a quiz app that:

- Rewards users with **gold coins** for quiz play and AdMob revenue sharing.  
- Converts coins to **PKR** using settings in `app_settings`.  
- Allows users to request **payouts** via bank transfer, Easypaisa, or JazzCash.

## Context

Relevant tables and settings:

- `profiles`:
  - `coins_balance`, `lifetime_earned_coins`, `is_blocked`.  
- `coin_transactions`:
  - `type` (`earn`, `spend`, `adjustment`, `withdrawal`, `ad_revenue_share`).  
  - `amount_coins`, `pkr_value_per_coin`, `description`, `created_at`.  
- `payout_requests`:
  - `coins_requested`, `pkr_amount`, `status`, `method`, `method_details`.  
- `app_settings`:
  - `coins_to_pkr` → `{ "pkr_per_coin": ... }`.  
  - `withdrawal_threshold` → `{ "min_pkr": 500 }`.  
  - `ad_revenue_share` → user vs platform share.
- `ad_revenue_user_distributions`:
  - Per‑user distribution of ad revenue in PKR and coins.

Relevant APIs:

- `GET /api/app/wallet`.  
- `GET /api/app/wallet/transactions`.  
- `GET /api/app/wallet/ad-revenue-shares`.  
- `GET /api/app/payout/settings`.  
- `POST /api/app/payout/requests`.  
- `GET /api/app/payout/requests`.

## Tech Stack

- React Native (TypeScript).  
- React Navigation Wallet stack (within Main tabs).  
- React Query (or similar) for wallet‑related API calls.  
- Formatting utilities for coins and PKR values.

## Screens & Flows

Design the following screens.

### 1. Wallet Overview

- **WalletScreen**
  - Uses `GET /api/app/wallet` to display:
    - Current `coins_balance`.  
    - PKR equivalent using current `pkr_per_coin`.  
    - Summary:
      - Total coins from quiz play.  
      - Total coins from AdMob revenue share.  
      - Total withdrawn amount.
  - Uses `GET /api/app/wallet/transactions` to show recent `coin_transactions`:
    - Type, amount (coins + PKR at time), description, date.  
  - UX:
    - Clearly indicate that PKR equivalent depends on current `coins_to_pkr`.  
    - Highlight earnings from ad revenue separately if needed.  
  - Actions:
    - “Request Payout” → `PayoutRequestScreen`.  
    - “View All Transactions” / “View Payout History`.

### 2. Payout Request

- **PayoutRequestScreen**
  - Uses `GET /api/app/payout/settings`:
    - `pkr_per_coin`.  
    - `min_pkr` (withdrawal threshold).  
    - Allowed methods: `bank_transfer`, `easypaisa`, `jazzcash`.
  - Shows:
    - Current coins and PKR equivalent.  
    - Minimum withdrawal threshold (e.g. 500 PKR).
  - Form elements:
    - Input for coins **or** PKR amount (with conversion between them).  
    - Payment method selector.  
    - Method details:
      - Bank transfer:
        - Account title, account number, bank name.  
      - Easypaisa/JazzCash:
        - Account name, mobile number.
  - Validation:
    - Requested PKR amount >= `min_pkr`.  
    - User has enough coins balance.  
    - Required method details are present and valid format.
  - On submit:
    - Calls `POST /api/app/payout/requests` with:
      - `coins_requested` or `pkr_amount`.  
      - `method` and `method_details`.
    - Backend:
      - Validates thresholds and balances.  
      - Creates `payout_requests` row with `status = 'pending'`.  
      - Creates `coin_transactions` entry of type `'withdrawal'` for reserved coins.  
    - UX:
      - Show success state with summary.  
      - Offer navigation to `PayoutHistoryScreen`.

### 3. Payout History

- **PayoutHistoryScreen**
  - Uses `GET /api/app/payout/requests` to list payouts.  
  - Shows for each request:
    - Date.  
    - Method and masked details.  
    - `pkr_amount` and equivalent coins at the time.  
    - Status (`pending`, `approved`, `rejected`, `paid`).  
  - Provide filters (optional) by status or date range.  
  - Clicking a request shows a detail view if needed (notes, timestamps).

### 4. Ad Revenue Shares (Optional Detailed View)

- Optional **AdRevenueDetailsScreen**
  - Uses `GET /api/app/wallet/ad-revenue-shares`:
    - Date, AdMob app, `impressions_count`, `share_pkr`, `share_coins`.  
  - Explains how ad views contributed to earnings.  
  - Connects this to communication stages if relevant.

## UX & Transparency

Ensure:

- Clear explanations of:
  - How coins are earned (quizzes and ad revenue).  
  - How coins convert to PKR (using current `coins_to_pkr`).  
  - Why minimum withdrawal threshold exists and its current value.  
  - That payouts are processed and approved by admins in the portal.

- Safe flows:
  - Prevent duplicate submissions.  
  - Show pending state and discourage repeated requests when one is already pending.  
  - Respect `is_blocked` users by disabling payout actions if backend enforces it.

## Error Handling & Edge Cases

Define behavior when:

- `GET /api/app/wallet` or `/payout/settings` fails:
  - Show retry and safe fallback messaging.  
- `POST /api/app/payout/requests` fails:
  - Show exact error (below threshold, not enough coins, invalid method details).  
  - Keep user’s input so they can adjust and resubmit.  
- User changes `coins_to_pkr` on backend after user opens form:
  - Revalidate PKR amounts on submit using latest settings.

## Deliverables

From this prompt, generate:

1. A detailed React Native design for Wallet, Payout Request, Payout History, and optional Ad Revenue screens.  
2. Data flow descriptions between these screens and `/api/app/...` endpoints.  
3. Validation and error‑handling rules for payout flows and conversions.  
4. UX guidelines for clear, transparent earnings and payout information.  
5. Integration notes showing how wallet data ties back to quiz sessions, ad impressions, and admin revenue‑sharing rules.

