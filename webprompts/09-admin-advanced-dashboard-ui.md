# Admin Portal – Advanced Analytics Dashboard UI Prompt

Use this prompt in WebPrompts to build **advanced dashboard pages and visualizations** in the admin portal, consuming the reporting APIs created from the previous prompt.

These dashboards are for the admin roles defined in the **Admin Portal – Global System Prompt** (Super Admin, Super Manager, Super Viewer) and are never visible to regular player accounts.

---

You are enhancing the **admin frontend (Next.js)** with rich analytics dashboards that make data easy to understand and actionable for business decisions and revenue growth, visible only to Super Admin, Super Manager, and Super Viewer accounts (not regular players).

The backend exposes reporting APIs under `/api/admin/reporting/...` that provide:

- User growth and engagement stats.  
- Quiz and question performance.  
- AdMob revenue and ad performance.  
- Revenue sharing and coin liability summaries.  
- Payout and cashflow stats.

## Dashboard Goals

Design UX so an admin can:

1. See high‑level **health of the business** at a glance.  
2. Drill into specific quizzes, apps, and time ranges.  
3. Identify issues (low retention, low eCPM, high churn, payout bottlenecks).  
4. Spot opportunities to **increase revenue** and improve user experience.

## Main Dashboard Page (`/admin/dashboard/analytics`)

Implement a dashboard with:

- Time range selector:
  - Today, Yesterday, Last 7 days, Last 30 days, Custom range.  
- Filters:
  - Quiz app (AdMob app).  
  - Quiz selection (optional dropdown).  

Sections/Cards:

1. **Key KPIs**
   - DAU/WAU/MAU for selected period.  
   - Total quiz sessions and completion rate.  
   - Total AdMob impressions and estimated earnings (PKR).  
   - User vs platform revenue share (PKR).  
   - Total coins minted and coins withdrawn.  
   - Pending payouts count and PKR amount.

2. **User Growth & Engagement**
   - Line chart: daily new users and active users.  
   - Bar/line combo: average sessions per user.  
   - Retention chart (cohort view or D1/D7/D30 bars).  

3. **Quiz & Question Performance**
   - Table or bar chart:
     - Top 10 quizzes by:
       - Revenue generated.  
       - Sessions played.  
       - Completion rate.  
   - Drilldown panel for a selected quiz:
     - Per‑question correctness rate.  
     - Questions with unusually low correctness (possible confusion).  

4. **AdMob Performance**
   - Line chart:
     - Impressions and earnings over time.  
   - KPI cards:
     - eCPM.  
     - CTR.  
   - Funnel widget:
     - Average questions answered per session.  
     - Drop‑off after certain question numbers (e.g. after 3rd or 5th question).  

5. **Revenue Sharing & Payouts**
   - Donut or stacked bar:
     - User share vs platform share (PKR) for selected period.  
   - Table:
     - Top users by earnings.  
   - Payouts:
     - Trend of approved/paid payouts.  
     - Average payout amount.  
     - Average time to pay.

## Additional Drilldown Pages

Implement additional pages under `/admin/reporting/...`:

1. **Quiz Analytics (`/admin/reporting/quizzes`)**
   - Filters: category, difficulty, time range.  
   - Table:
     - Quiz, sessions, completion rate, average score, coins earned, AdMob impressions and revenue.  
   - Detail view for each quiz including per‑question stats.

2. **User Analytics (`/admin/reporting/users`)**
   - Users list with:
     - Total sessions, coins earned, ad impressions, total revenue share.  
   - Segments:
     - Power users, casual users, dormant users.  
   - Ability to filter and export segments.

3. **AdMob & Monetization Analytics (`/admin/reporting/monetization`)**
   - Charts focused on AdMob performance, eCPM by app and over time.  
   - Ads per session distribution:
     - How many sessions show 1–10 ads.  
   - Drop‑off chart vs number of questions/ads.

4. **Payout & Cashflow Analytics (`/admin/reporting/payouts`)**
   - Monthly payout totals vs AdMob income.  
   - Method breakdown (bank/Easypaisa/JazzCash).  
   - SLA charts (time from request to paid).

## Implementation Details

From this prompt, generate:

1. **Next.js pages and components** for the dashboard and drilldown views.  
2. Examples of **data fetching hooks** (e.g. React Query) for calling `/api/admin/reporting/...`.  
3. Example chart components (using a lightweight chart library or simple SVG) that consume the reporting APIs.  
4. Reusable UI elements:
   - Time range selector.  
   - Filter panels.  
   - KPI cards.  
   - Simple tables with sorting and pagination.

Focus on:

- Clear visual hierarchy: most important KPIs first.  
- Fast iteration: minimal but extensible chart implementations.  
- Making it easy for a non‑technical admin to read trends and understand what is happening.
