# Admin Portal – AI Insights & Revenue Optimization Prompt

Use this prompt in WebPrompts to add **AI‑powered insights and decision support** to the admin portal, helping increase revenue and improve user experience.

This AI module follows the admin roles defined in the **Admin Portal – Global System Prompt** (Super Admin, Super Manager, Super Viewer) and must not be accessible to regular player accounts.

---

You are integrating **AI** into the admin portal as a “Revenue & Growth Copilot” for Super Admin, Super Manager, and Super Viewer roles (never regular players) that:

- Reads analytics data (not raw PII).  
- Generates natural language insights and recommendations.  
- Helps admins decide how to adjust quizzes, rewards, and revenue share settings to increase revenue and retention.

The existing analytics and data include:

- User growth and engagement stats.  
- Quiz and question performance.  
- AdMob revenue and eCPM metrics.  
- Revenue sharing distributions and coin liabilities.  
- Payout and cashflow stats.  
- App settings:
  - `coins_to_pkr`.  
  - `withdrawal_threshold`.  
  - `ad_revenue_share` (user vs platform percent).

## Goals

Create an **AI Insights module** that can:

1. Summarize current performance in plain language.  
2. Highlight risks and anomalies.  
3. Suggest concrete actions to increase revenue and engagement.  
4. Simulate impact of changes (e.g. adjusting revenue share or quiz rewards) using simple models.  

## AI Data Inputs

Define an internal data aggregation layer that:

- Uses existing reporting APIs or views to build a compact JSON “state of business”, including:
  - Time‑range metrics (last 7/30 days).  
  - Per‑quiz and per‑app performance.  
  - User segments and their earnings.  
  - AdMob metrics (impressions, earnings, eCPM, drop‑off patterns).  
  - Current settings (coin value, thresholds, revenue share).  
- Strips any direct personal identifiers (use aggregated stats and anonymized segments).

## AI Use Cases

Design prompts and backend endpoints for the following use cases:

1. **Performance Summary**
   - Endpoint: `POST /api/admin/ai/summary`
   - Input:
     - Date range, optional filters (app, quiz).  
   - Output:
     - A concise natural language summary of:
       - User growth and engagement.  
       - Quiz performance highlights.  
       - AdMob performance (eCPM, impressions, revenue).  
       - Payout and cashflow health.  

2. **Revenue Optimization Suggestions**
   - Endpoint: `POST /api/admin/ai/revenue-suggestions`
   - Input:
     - Aggregated metrics, current settings, constraints (e.g. do not exceed certain payout ratio).  
   - Output:
     - Ranked list of recommendations, such as:
       - Which quizzes to promote or improve.  
       - Adjust reward coins per quiz to balance retention and cost.  
       - Suggestions on altering `user_share_percent` vs `platform_share_percent` to improve margins while keeping users motivated.  
       - Guidance on pacing payouts (e.g. encouraging users to reach higher thresholds).  

3. **Content & Difficulty Tuning**
   - Endpoint: `POST /api/admin/ai/content-tuning`
   - Input:
     - Per‑quiz and per‑question stats (completion rate, correctness, drop‑off after certain questions).  
   - Output:
     - Suggestions on:
       - Questions that may be too hard or confusing.  
       - Topics/categories that drive higher engagement or revenue.  
       - Difficulty balancing across quizzes to maximize completion and ad impressions (while respecting max 10 questions and 1 ad per question).

4. **What‑If Simulation**
   - Endpoint: `POST /api/admin/ai/what-if`
   - Input:
     - Proposed changes:
       - New `pkr_per_coin`.  
       - New `withdrawal_threshold`.  
       - New revenue share percentages.  
       - Changed reward coins per quiz.  
   - Output:
     - Estimated qualitative impact, for example:
       - How user earnings distribution might change.  
       - How platform margin might change.  
       - Risks of increased payouts or decreased user motivation.  
     - Clear caveat that this is an estimate, not a guarantee.

## Implementation Details

From this prompt, generate:

1. Backend design:
   - TypeScript endpoints under `/api/admin/ai/...`.  
   - Internal functions to:
     - Fetch and aggregate necessary analytics.  
     - Construct clean, well‑documented JSON prompts for the AI model.  
   - Integration with an LLM provider (e.g. OpenAI), server‑side only.
2. Frontend UI in admin portal:
   - New section: `/admin/ai-insights` with:
     - Controls to select date range, quiz, app, and scenario parameters.  
     - Panels to show:
       - Performance Summary.  
       - Revenue Suggestions.  
       - Content Tuning Insights.  
       - What‑If Simulation results.  
   - UX pattern:
     - “Generate insights” button that calls the relevant AI endpoint.  
     - Loading state and clear error messaging.
3. Safety and privacy considerations:
   - Ensure prompts do not include PII or raw user identifiers.  
   - Consider rate limiting AI calls.  
   - Log AI usage in `audit_logs` with action types like `AI_SUMMARY`, `AI_REVENUE_SUGGESTIONS`, etc.

Focus on creating a **reusable AI integration layer** and intuitive UI that helps admins make smarter decisions to increase revenue while maintaining a fair experience for users.
