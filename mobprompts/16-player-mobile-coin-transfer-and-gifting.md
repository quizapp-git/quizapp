# Player Quiz App – Mobile Coin Transfer & Gifting Prompt

Use this prompt in MobPrompts to generate the **coin transfer and gifting experience** for the player‑facing React Native quiz app, where users can **send (gift or sell) coins to other users by username**, consistent with the existing Supabase schema and backend rules.

---

You are an expert **fintech and mobile UX engineer** designing the **coin transfer** flows in the player app.  
This module:

- Lets a user transfer coins from their own balance to another player, identified by **username**.  
- Supports two intents:
  - **Gift coins** (no direct cash settlement in the app).  
  - **Sell coins** (user chooses to transfer coins, with price or settlement handled by backend policies or outside the app).  
- Uses only `/api/app/...` endpoints and the shared Supabase schema (especially `profiles`, `coin_transactions`, `app_settings`), without bypassing admin‑side controls or payouts.

Treat “sell” as a business intent label and transaction type; all monetary settlement, fraud checks, and regulatory compliance are enforced server‑side and in the admin portal.

## Context

Existing building blocks:

- `profiles`:
  - `id`, `email`, `username`, `is_blocked`, `coins_balance`, `lifetime_earned_coins`.  
- `coin_transactions`:
  - `id`, `user_id`, `type`, `amount_coins`, `pkr_value_per_coin`, `description`, `created_at`, etc.  
  - Current `type` values include: `'earn'`, `'spend'`, `'adjustment'`, `'withdrawal'`, `'ad_revenue_share'`.  
- `app_settings`:
  - `coins_to_pkr` → `{ "pkr_per_coin": ... }`.  
  - `withdrawal_threshold` → minimum PKR for payout.  
  - `ad_revenue_share`, and potentially other keys the admin portal defines.

Player APIs for wallet and profile:

- `GET /api/app/me` for the current user’s profile and balances.  
- `GET /api/app/wallet` and `/wallet/transactions`.  
- `GET /api/app/settings` (and other wallet‑related endpoints).

For this module, assume the backend exposes new **player‑side endpoints**, for example:

- `GET /api/app/users/lookup?username=...`  
- `POST /api/app/coins/transfer`  
- Optional `GET /api/app/coins/transfer/quote` or similar for showing approximate PKR value of a transfer.

The mobile app must not modify the database directly; it only calls `/api/app/...` and displays results and errors.

## Tech Stack

- React Native (TypeScript).  
- React Navigation:
  - Integrate this feature under Wallet tab (e.g. “Send Coins” screen).  
- React Query (or similar) for:
  - Username lookup.  
  - Submitting transfer requests.  
  - Refreshing wallet after transfer.

## Screens & Flows

Design the following screens and flows.

### 1. Entry Point – “Send Coins”

- **WalletScreen integration**
  - Add an action/button such as “Send Coins” or “Gift/Sell Coins”.  
  - Navigates to `CoinTransferScreen`.

### 2. Coin Transfer Screen

- **CoinTransferScreen**
  - Purpose: allow the current user to transfer coins to another player by username.  
  - Sections:
    1. **Recipient selection**
       - Input: recipient username.  
       - Button: “Lookup” or auto‑search as user types.  
       - Call `GET /api/app/users/lookup?username=...`.  
       - Show:
         - Matched user’s username and, optionally, avatar/short identifier.  
       - Error handling:
         - Username not found.  
         - Recipient is blocked or not eligible (backend decides; show message).
    2. **Transfer type**
       - Toggle or segmented control:
         - “Gift” vs “Sell”.  
       - “Gift”:
         - Pure coin transfer with no explicit sale price in the app.  
       - “Sell”:
         - Still a coin transfer, but:
           - Label as “Sell” in the UI.  
           - Backend can track this via `coin_transactions` type and description.  
           - Any PKR settlement, if allowed, is handled by backend policies or offline between players; do not implement direct P2P cash in the client.
    3. **Amount and value**
       - Input: coins to send.  
       - Show:
         - Current user’s `coins_balance`.  
         - PKR equivalent of coins to send, based on `coins_to_pkr`.  
       - Validation:
         - Positive integer amount.  
         - Less than or equal to current balance.  
         - Optional: minimum/maximum per transfer as provided by backend.
    4. **Review and confirm**
       - Summary card showing:
         - From: current user (you).  
         - To: recipient username.  
         - Transfer type: Gift or Sell.  
         - Coins to send and approximate PKR value.  
       - “Confirm Transfer” button.

Flow on confirm:

1. Call `POST /api/app/coins/transfer` with body such as:
   - `recipient_username`.  
   - `amount_coins`.  
   - `intent` (`"gift"` or `"sell"`).  
   - Optional note.  
2. Backend:
   - Validates:
     - Sender has enough coins and is not blocked.  
     - Recipient exists and is eligible.  
     - Transfer limits.  
   - Creates coin transactions:
     - Sender: negative `amount_coins`, type like `'transfer_out_gift'` or `'transfer_out_sell'`.  
     - Recipient: positive `amount_coins`, type like `'transfer_in_gift'` or `'transfer_in_sell'`.  
   - Updates both `profiles.coins_balance`.  
   - Returns updated balances and a transfer receipt object.
3. UI:
   - Shows success screen with summary and updated wallet balance.  
   - Optionally offers:
     - “View Transaction Details”.  
     - “Send More Coins”.

### 3. Transfer History

- Integrate into existing Wallet transaction list:
  - `coin_transactions` entries with types representing transfers should display as:
    - “Sent X coins to @username (Gift)” or “Sold X coins to @username”, for sender.  
    - “Received X coins from @username (Gift/Sell)” for recipient.
  - Use description field and metadata returned from backend to display counterpart usernames and intent.

Optionally:

- **CoinTransferHistoryScreen**
  - Filtered view of wallet transactions showing only transfer‑related entries.  
  - Allows player to inspect past transfers and associated notes.

## UX & Safety Rules

The UI must:

- Clearly indicate:
  - Coins are being moved between player balances.  
  - For “Sell”, any actual money settlement is not guaranteed by the app unless backend and admin portal define explicit rules; mobile only shows labels and backend messages.

- Protect users:
  - Show clear confirmation with recipient username.  
  - Prevent accidental sending to the wrong user (e.g. show part of email or a profile hint from backend when allowed).  
  - Warn if recipient is not in friend list, depending on policy.

- Respect backend constraints:
  - If backend returns errors like:
    - Transfer disabled globally.  
    - Daily limit exceeded.  
    - Recipient not allowed to receive coins.  
  - Show corresponding messages and disable confirm.

## Error Handling & Edge Cases

Define behavior when:

- Username lookup fails:
  - Show “User not found” and keep user on the screen.  
- Transfer submission fails:
  - Show specific error message from backend (insufficient coins, limits, policy).  
  - Do not double‑submit; disable button during request.  
- Network issues:
  - Allow retry for lookup and transfer.  
  - Do not show success unless backend confirms.

Ensure:

- Wallet and balances are refreshed after a successful transfer.  
- The transaction appears in wallet history consistently with other `coin_transactions`.

## Backend Considerations (Conceptual)

While this prompt is mobile‑focused, describe assumptions for backend:

- New `type` values in `coin_transactions` for transfers (e.g. `'transfer_out_gift'`, `'transfer_in_gift'`, `'transfer_out_sell'`, `'transfer_in_sell'`).  
- Optional dedicated `coin_transfers` table to link sender, recipient, and transaction IDs.  
- Admin‑side reporting to monitor:
  - Large or suspicious transfers.  
  - Sell‑type transfers that may correlate with payouts.

The React Native client must treat these as opaque rules and rely on backend responses.

## Deliverables

From this prompt, generate:

1. A detailed React Native design for `CoinTransferScreen` and any related confirmation/history views.  
2. Validation and UX rules for selecting recipients by username and entering amounts.  
3. Interaction patterns with `/api/app/users/lookup` and `/api/app/coins/transfer`.  
4. Wallet integration details showing how transfers appear in transaction history.  
5. Safety and communication guidelines so users clearly understand gifting vs selling and cannot easily mis‑send coins.

