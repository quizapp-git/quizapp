# Player Quiz App – Mobile Design System & Theming Prompt

Use this prompt in MobPrompts to generate the **design system, theming, and reusable component library** for the player‑facing React Native quiz app.

---

You are an expert **mobile UI systems engineer** designing a **design system and theming approach** that:

- Makes the app look cohesive, high‑quality, and brand‑consistent.  
- Supports light/dark modes and future re‑skins.  
- Keeps quiz, wallet, leaderboards, social, and voice features visually aligned.

## Context

The app:

- Has multiple modules and screens (auth, quizzes, ads, wallet, leaderboards, social, voice).  
- Needs to display core concepts consistently:
  - Coins, PKR, quiz difficulty, ad policy, communication stages, ranks.  
- Will evolve over time with new modules.

You are designing a design system that other mobile prompts can rely on.

## Tech & Integration

- React Native (TypeScript).  
- A theming mechanism:
  - React Context or a UI library with theme support.  
  - Potential integration with system light/dark mode preferences.  
- Component library for:
  - Buttons, inputs, cards, badges, modals, banners, tabs, lists.

## Design System Elements

### 1. Foundations

- Colors:
  - Define a core palette:
    - Primary, secondary, accent.  
    - Success, warning, error.  
    - Background and surface colors for light/dark.  
  - Ensure accessibility and contrast.

- Typography:
  - Heading, subtitle, body, caption sizes and weights.  
  - Consistent usage across screens (titles, labels, messages).

- Spacing & Layout:
  - Spacing scale (e.g. 4/8/12/16/24).  
  - Layout patterns for cards, lists, and modals.

### 2. Components

Define mobile components such as:

- Button (primary, secondary, text, icon).  
- Input (text fields, dropdowns, numeric fields).  
- Card (quiz card, wallet summary card, leaderboard entry).  
- Badge/chip (difficulty, stage, status).  
- Banner (informational messages about ads, payouts, unlocks).  
- Tabs/segmented controls for leaderboards and multi‑tab screens.  
- Modal & bottom sheet for confirmations and extra details.

Ensure:

- Components accept theme tokens instead of hard‑coded values.  
- Components are composable and can be reused across prompts.

### 3. Domain‑Specific Patterns

Design visual patterns for:

- Quiz difficulty badges (easy/medium/hard/mixed).  
- Coin and PKR display (icons, color, number formatting).  
- Ad policy notices (non‑scary but clear).  
- Communication stage indicators (locked/unlocked states).  
- Rank display for leaderboards (top 3 vs others).

### 4. Theming & Customization

- Support:
  - App‑wide theme toggle (light/dark).  
  - Automatic theme following system appearance where allowed.  
- Prepare for:
  - Brand variations for different games/apps sharing same backend.  
  - Admin‑configurable accent colors or artwork, if future prompts define them.

## Implementation Approach

Describe:

- How to structure a `design-system` or `ui` folder with:
  - Tokens (colors, typography, spacing).  
  - Core components.  
  - Domain components (quiz card, wallet card, leaderboard row).

- How other modules:
  - Import and use these components.  
  - Avoid duplicating UI logic in each module prompt.

## Deliverables

From this prompt, generate:

1. A design system structure for the React Native app (folders, tokens, components).  
2. Definitions of core components and their props.  
3. Domain‑specific UI patterns for quizzes, wallet, leaderboards, and communication stages.  
4. Theming strategy for light/dark and future brand customizations.  
5. Guidelines for other prompts to stay consistent with this design system.

