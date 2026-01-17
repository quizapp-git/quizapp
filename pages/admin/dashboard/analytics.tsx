import Head from "next/head";
import { useEffect, useMemo, useState } from "react";

type TimeRangeKey = "today" | "yesterday" | "last7" | "last30" | "custom";

type UserGrowthPoint = {
  date: string;
  new_users: number;
  dau: number;
  total_sessions_started: number;
  total_sessions_completed: number;
  avg_sessions_per_user: number;
};

type UserRetentionPoint = {
  cohort_date: string;
  day_offset: number;
  active_users: number;
};

type UserGrowthReport = {
  bucket: "day" | "week" | "month";
  range: { from: string; to: string };
  growth: UserGrowthPoint[];
  retention: UserRetentionPoint[];
};

type QuizPerformancePoint = {
  quiz_id: string;
  date: string;
  sessions_started: number;
  sessions_completed: number;
  avg_correct_answers: number;
  avg_coins_earned: number;
  completion_rate: number;
  difficulty: string;
  title: string;
  status: string;
};

type QuizPerformanceReport = {
  range: { from: string; to: string };
  points: QuizPerformancePoint[];
  top_quizzes: QuizPerformancePoint[];
  underperforming_quizzes: QuizPerformancePoint[];
};

type AdmobAppDailyPoint = {
  app_id: string;
  date: string;
  impressions: number;
  clicks: number;
  ctr: number;
  estimated_earnings_usd: number;
  estimated_earnings_pkr: number;
  ecpm_pkr: number;
};

type QuizAdPerformancePoint = {
  quiz_id: string;
  date: string;
  avg_ads_per_session: number;
  sessions_after_first_ad: number;
  sessions_after_third_ad: number;
  sessions_after_fifth_ad: number;
  total_sessions: number;
};

type AdmobReport = {
  range: { from: string; to: string };
  app_daily: AdmobAppDailyPoint[];
  quiz_ad_performance: QuizAdPerformancePoint[];
};

type RevenueShareSummaryPoint = {
  date: string;
  admob_app_id: string;
  total_earnings_pkr: number;
  user_share_pkr: number;
  platform_share_pkr: number;
};

type UserEarningsPoint = {
  date: string;
  user_id: string;
  total_share_pkr: number;
  total_share_coins: number;
};

type CoinLiabilityPoint = {
  date: string;
  total_coins_in_circulation: number;
  total_liability_pkr: number;
};

type CoinVelocityPoint = {
  date: string;
  coins_generated: number;
  coins_withdrawn: number;
};

type RevenueShareReport = {
  range: { from: string; to: string };
  revenue_share: RevenueShareSummaryPoint[];
  user_distribution: UserEarningsPoint[];
  coin_liability: CoinLiabilityPoint[];
  coin_velocity: CoinVelocityPoint[];
};

type PayoutStatsPoint = {
  date: string;
  status: string;
  requests_count: number;
  total_pkr: number;
};

type PayoutMethodPoint = {
  date: string;
  method: string;
  status: string;
  requests_count: number;
  total_pkr: number;
};

type PayoutSlaPoint = {
  date: string;
  avg_hours_to_paid: number | null;
  paid_count: number;
  rejected_count: number;
};

type CashflowPoint = {
  date: string;
  admob_inflow_pkr: number;
  payouts_outflow_pkr: number;
};

type PayoutsReport = {
  range: { from: string; to: string };
  payouts: PayoutStatsPoint[];
  methods: PayoutMethodPoint[];
  sla: PayoutSlaPoint[];
  cashflow: CashflowPoint[];
};

type AiState = "idle" | "loading" | "error" | "success";

type FetchState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

type AdminReportParams = Record<string, string | null | undefined>;

type KeyKpis = {
  dau: number;
  wau: number;
  mau: number;
  totalSessions: number;
  completionRate: number;
  impressions: number;
  earningsPkr: number;
  userSharePkr: number;
  platformSharePkr: number;
  coinsGenerated: number;
  coinsWithdrawn: number;
  pendingPayoutsCount: number;
  pendingPayoutsPkr: number;
};

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getPresetRange(key: TimeRangeKey): { from: string; to: string } {
  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (key === "today") {
    const value = formatDate(end);
    return { from: value, to: value };
  }
  if (key === "yesterday") {
    const start = new Date(end);
    start.setDate(start.getDate() - 1);
    const value = formatDate(start);
    return { from: value, to: value };
  }
  if (key === "last7") {
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    return { from: formatDate(start), to: formatDate(end) };
  }
  if (key === "last30") {
    const start = new Date(end);
    start.setDate(start.getDate() - 29);
    return { from: formatDate(start), to: formatDate(end) };
  }
  const value = formatDate(end);
  return { from: value, to: value };
}

function useAdminReport<T>(
  path: string,
  params: AdminReportParams
): FetchState<T> {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: false,
    error: null
  });

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setState((previous) => ({ ...previous, loading: true, error: null }));
      try {
        const url = new URL(path, window.location.origin);
        Object.entries(params).forEach(([key, value]) => {
          if (value && value.length > 0) {
            url.searchParams.set(key, value);
          }
        });
        const response = await fetch(url.toString());
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          const message =
            body && typeof body.error === "string"
              ? body.error
              : `Request failed with status ${response.status}`;
          if (!cancelled) {
            setState({ data: null, loading: false, error: message });
          }
          return;
        }
        const json = (await response.json()) as T;
        if (!cancelled) {
          setState({ data: json, loading: false, error: null });
        }
      } catch (error: any) {
        if (!cancelled) {
          setState({
            data: null,
            loading: false,
            error: error?.message || "Request failed"
          });
        }
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [path, JSON.stringify(params)]);

  return state;
}

function computeKeyKpis(
  userGrowth: UserGrowthReport | null,
  admob: AdmobReport | null,
  revenueShare: RevenueShareReport | null,
  payouts: PayoutsReport | null
): KeyKpis | null {
  if (!userGrowth || !admob || !revenueShare || !payouts) {
    return null;
  }

  const growthPoints = userGrowth.growth;
  const lastGrowth = growthPoints[growthPoints.length - 1];

  const dau = lastGrowth ? lastGrowth.dau : 0;

  const recentGrowth = growthPoints.slice(-7);
  const last30Growth = growthPoints.slice(-30);

  const wau = recentGrowth.reduce((sum, point) => sum + point.dau, 0);
  const mau = last30Growth.reduce((sum, point) => sum + point.dau, 0);

  const totalSessionsStarted = growthPoints.reduce(
    (sum, point) => sum + point.total_sessions_started,
    0
  );
  const totalSessionsCompleted = growthPoints.reduce(
    (sum, point) => sum + point.total_sessions_completed,
    0
  );
  const completionRate =
    totalSessionsStarted > 0
      ? (totalSessionsCompleted / totalSessionsStarted) * 100
      : 0;

  const impressions = admob.app_daily.reduce(
    (sum, point) => sum + point.impressions,
    0
  );
  const earningsPkr = admob.app_daily.reduce(
    (sum, point) => sum + point.estimated_earnings_pkr,
    0
  );

  const userSharePkr = revenueShare.revenue_share.reduce(
    (sum, point) => sum + point.user_share_pkr,
    0
  );
  const platformSharePkr = revenueShare.revenue_share.reduce(
    (sum, point) => sum + point.platform_share_pkr,
    0
  );

  const coinsGenerated = revenueShare.coin_velocity.reduce(
    (sum, point) => sum + point.coins_generated,
    0
  );
  const coinsWithdrawn = revenueShare.coin_velocity.reduce(
    (sum, point) => sum + point.coins_withdrawn,
    0
  );

  const pendingPayouts = payouts.payouts.filter(
    (point) => point.status.toLowerCase() === "pending"
  );
  const pendingPayoutsCount = pendingPayouts.reduce(
    (sum, point) => sum + point.requests_count,
    0
  );
  const pendingPayoutsPkr = pendingPayouts.reduce(
    (sum, point) => sum + point.total_pkr,
    0
  );

  return {
    dau,
    wau,
    mau,
    totalSessions: totalSessionsStarted,
    completionRate,
    impressions,
    earningsPkr,
    userSharePkr,
    platformSharePkr,
    coinsGenerated,
    coinsWithdrawn,
    pendingPayoutsCount,
    pendingPayoutsPkr
  };
}

type TimeRangeSelectorProps = {
  rangeKey: TimeRangeKey;
  onRangeKeyChange: (value: TimeRangeKey) => void;
  customFrom: string;
  customTo: string;
  onCustomFromChange: (value: string) => void;
  onCustomToChange: (value: string) => void;
};

function TimeRangeSelector(props: TimeRangeSelectorProps) {
  const {
    rangeKey,
    onRangeKeyChange,
    customFrom,
    customTo,
    onCustomFromChange,
    onCustomToChange
  } = props;

  return (
    <section style={cardStyles}>
      <h2 style={subtitleStyles}>Time range</h2>
      <div style={timeRangeRowStyles}>
        <select
          value={rangeKey}
          onChange={(event) =>
            onRangeKeyChange(event.target.value as TimeRangeKey)
          }
          style={inputStyles}
        >
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="last7">Last 7 days</option>
          <option value="last30">Last 30 days</option>
          <option value="custom">Custom range</option>
        </select>
        {rangeKey === "custom" && (
          <>
            <label style={inlineLabelStyles}>
              From
              <input
                type="date"
                value={customFrom}
                onChange={(event) => onCustomFromChange(event.target.value)}
                style={inputStyles}
              />
            </label>
            <label style={inlineLabelStyles}>
              To
              <input
                type="date"
                value={customTo}
                onChange={(event) => onCustomToChange(event.target.value)}
                style={inputStyles}
              />
            </label>
          </>
        )}
      </div>
    </section>
  );
}

type FiltersProps = {
  appId: string;
  quizId: string;
  onAppIdChange: (value: string) => void;
  onQuizIdChange: (value: string) => void;
};

function Filters(props: FiltersProps) {
  const { appId, quizId, onAppIdChange, onQuizIdChange } = props;

  return (
    <section style={cardStyles}>
      <h2 style={subtitleStyles}>Filters</h2>
      <div style={rowStyles}>
        <label style={labelStyles}>
          AdMob app
          <input
            type="text"
            value={appId}
            onChange={(event) => onAppIdChange(event.target.value)}
            style={inputStyles}
            placeholder="Optional AdMob app ID"
          />
        </label>
        <label style={labelStyles}>
          Quiz
          <input
            type="text"
            value={quizId}
            onChange={(event) => onQuizIdChange(event.target.value)}
            style={inputStyles}
            placeholder="Optional quiz ID"
          />
        </label>
      </div>
    </section>
  );
}

type SimpleLineChartProps = {
  data: { label: string; value: number }[];
  color: string;
};

function SimpleLineChart(props: SimpleLineChartProps) {
  const { data, color } = props;
  if (!data.length) {
    return <div style={emptyChartStyles}>No data</div>;
  }
  const width = 100;
  const height = 40;
  const maxValue = data.reduce(
    (max, point) => (point.value > max ? point.value : max),
    0
  );
  const safeMax = maxValue > 0 ? maxValue : 1;
  const points = data
    .map((point, index) => {
      const x =
        data.length === 1
          ? width / 2
          : (index / (data.length - 1)) * (width - 4) + 2;
      const y =
        height - 2 - (point.value / safeMax) * (height - 4);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={chartSvgStyles}
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        points={points}
      />
    </svg>
  );
}

type SimpleBarChartProps = {
  data: { label: string; value: number }[];
  colors?: string[];
};

function SimpleBarChart(props: SimpleBarChartProps) {
  const { data, colors } = props;
  if (!data.length) {
    return <div style={emptyChartStyles}>No data</div>;
  }
  const maxValue = data.reduce(
    (max, point) => (point.value > max ? point.value : max),
    0
  );
  const safeMax = maxValue > 0 ? maxValue : 1;
  return (
    <div style={barChartContainerStyles}>
      {data.map((point, index) => {
        const heightPercent = (point.value / safeMax) * 100;
        const color =
          colors && colors[index % colors.length]
            ? colors[index % colors.length]
            : "#4f46e5";
        return (
          <div key={point.label} style={barChartBarWrapperStyles}>
            <div
              style={{
                ...barChartBarStyles,
                height: `${heightPercent}%`,
                backgroundColor: color
              }}
            />
            <div style={barChartLabelStyles}>{point.label}</div>
          </div>
        );
      })}
    </div>
  );
}

function KeyKpiSection(props: { kpis: KeyKpis | null; loading: boolean }) {
  const { kpis, loading } = props;
  return (
    <section style={cardStyles}>
      <h2 style={subtitleStyles}>Key KPIs</h2>
      {loading && !kpis && <div style={textStyles}>Loading...</div>}
      {!loading && !kpis && (
        <div style={textStyles}>No data available for this range.</div>
      )}
      {kpis && (
        <div style={kpiGridStyles}>
          <KpiCard
            label="DAU"
            value={kpis.dau.toLocaleString()}
          />
          <KpiCard
            label="WAU (sum of last 7 days)"
            value={kpis.wau.toLocaleString()}
          />
          <KpiCard
            label="MAU (sum of last 30 days)"
            value={kpis.mau.toLocaleString()}
          />
          <KpiCard
            label="Total quiz sessions"
            value={kpis.totalSessions.toLocaleString()}
          />
          <KpiCard
            label="Completion rate"
            value={`${kpis.completionRate.toFixed(1)}%`}
          />
          <KpiCard
            label="Ad impressions"
            value={kpis.impressions.toLocaleString()}
          />
          <KpiCard
            label="Ad earnings (PKR)"
            value={kpis.earningsPkr.toFixed(0)}
          />
          <KpiCard
            label="User share (PKR)"
            value={kpis.userSharePkr.toFixed(0)}
          />
          <KpiCard
            label="Platform share (PKR)"
            value={kpis.platformSharePkr.toFixed(0)}
          />
          <KpiCard
            label="Coins minted"
            value={kpis.coinsGenerated.toFixed(0)}
          />
          <KpiCard
            label="Coins withdrawn"
            value={kpis.coinsWithdrawn.toFixed(0)}
          />
          <KpiCard
            label="Pending payouts"
            value={`${kpis.pendingPayoutsCount.toLocaleString()} (${kpis.pendingPayoutsPkr.toFixed(
              0
            )} PKR)`}
          />
        </div>
      )}
    </section>
  );
}

type KpiCardProps = {
  label: string;
  value: string;
};

function KpiCard(props: KpiCardProps) {
  const { label, value } = props;
  return (
    <div style={kpiCardStyles}>
      <div style={kpiLabelStyles}>{label}</div>
      <div style={kpiValueStyles}>{value}</div>
    </div>
  );
}

function UserGrowthSection(props: { report: UserGrowthReport | null }) {
  const { report } = props;
  const growth = report?.growth ?? [];
  const retention = report?.retention ?? [];

  const newUsersSeries = growth.map((point) => ({
    label: point.date,
    value: point.new_users
  }));
  const dauSeries = growth.map((point) => ({
    label: point.date,
    value: point.dau
  }));

  const d1 = retention.filter((point) => point.day_offset === 1);
  const d7 = retention.filter((point) => point.day_offset === 7);
  const d30 = retention.filter((point) => point.day_offset === 30);

  const retentionBars = [
    {
      label: "D1",
      value: d1.reduce((sum, point) => sum + point.active_users, 0)
    },
    {
      label: "D7",
      value: d7.reduce((sum, point) => sum + point.active_users, 0)
    },
    {
      label: "D30",
      value: d30.reduce((sum, point) => sum + point.active_users, 0)
    }
  ];

  return (
    <section style={cardStyles}>
      <h2 style={subtitleStyles}>User growth and engagement</h2>
      {!growth.length && (
        <div style={textStyles}>No user growth data for this range.</div>
      )}
      {growth.length > 0 && (
        <div style={chartRowStyles}>
          <div style={chartColumnStyles}>
            <div style={chartTitleStyles}>Daily new users</div>
            <SimpleLineChart data={newUsersSeries} color="#4f46e5" />
          </div>
          <div style={chartColumnStyles}>
            <div style={chartTitleStyles}>Daily active users</div>
            <SimpleLineChart data={dauSeries} color="#10b981" />
          </div>
          <div style={chartColumnStyles}>
            <div style={chartTitleStyles}>Retention overview</div>
            <SimpleBarChart
              data={retentionBars}
              colors={["#f59e0b", "#6366f1", "#0ea5e9"]}
            />
          </div>
        </div>
      )}
    </section>
  );
}

function QuizPerformanceSection(props: {
  report: QuizPerformanceReport | null;
}) {
  const { report } = props;
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);

  if (!report) {
    return (
      <section style={cardStyles}>
        <h2 style={subtitleStyles}>Quiz and question performance</h2>
        <div style={textStyles}>No quiz performance data for this range.</div>
      </section>
    );
  }

  const topQuizzes = report.top_quizzes.slice(0, 10);
  const selectedQuizPoints = selectedQuizId
    ? report.points.filter((point) => point.quiz_id === selectedQuizId)
    : [];
  const selectedQuiz = topQuizzes.find(
    (quiz) => quiz.quiz_id === selectedQuizId
  );

  return (
    <section style={cardStyles}>
      <h2 style={subtitleStyles}>Quiz and question performance</h2>
      {!topQuizzes.length && (
        <div style={textStyles}>No quiz performance data for this range.</div>
      )}
      {topQuizzes.length > 0 && (
        <div style={quizSectionContainerStyles}>
          <div style={quizTableWrapperStyles}>
            <table style={tableStyles}>
              <thead>
                <tr>
                  <th style={thStyles}>Quiz</th>
                  <th style={thStyles}>Sessions</th>
                  <th style={thStyles}>Completion rate</th>
                  <th style={thStyles}>Avg score</th>
                  <th style={thStyles}>Avg coins</th>
                </tr>
              </thead>
              <tbody>
                {topQuizzes.map((quiz) => (
                  <tr
                    key={quiz.quiz_id}
                    style={
                      quiz.quiz_id === selectedQuizId
                        ? selectedRowStyles
                        : undefined
                    }
                    onClick={() =>
                      setSelectedQuizId(
                        quiz.quiz_id === selectedQuizId ? null : quiz.quiz_id
                      )
                    }
                  >
                    <td style={tdStyles}>{quiz.title || quiz.quiz_id}</td>
                    <td style={tdStyles}>
                      {quiz.sessions_started.toLocaleString()}
                    </td>
                    <td style={tdStyles}>
                      {(quiz.completion_rate * 100).toFixed(1)}%
                    </td>
                    <td style={tdStyles}>
                      {quiz.avg_correct_answers.toFixed(2)}
                    </td>
                    <td style={tdStyles}>
                      {quiz.avg_coins_earned.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={quizDetailPanelStyles}>
            <h3 style={subtitleStyles}>Selected quiz drilldown</h3>
            {!selectedQuiz && (
              <div style={textStyles}>
                Select a quiz to see its trend over time.
              </div>
            )}
            {selectedQuiz && selectedQuizPoints.length > 0 && (
              <>
                <div style={textStyles}>
                  {selectedQuiz.title || selectedQuiz.quiz_id}
                </div>
                <div style={chartRowStyles}>
                  <div style={chartColumnStyles}>
                    <div style={chartTitleStyles}>Sessions started</div>
                    <SimpleLineChart
                      data={selectedQuizPoints.map((point) => ({
                        label: point.date,
                        value: point.sessions_started
                      }))}
                      color="#6366f1"
                    />
                  </div>
                  <div style={chartColumnStyles}>
                    <div style={chartTitleStyles}>Completion rate</div>
                    <SimpleLineChart
                      data={selectedQuizPoints.map((point) => ({
                        label: point.date,
                        value: point.completion_rate * 100
                      }))}
                      color="#10b981"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function AdmobPerformanceSection(props: { report: AdmobReport | null }) {
  const { report } = props;
  if (!report) {
    return (
      <section style={cardStyles}>
        <h2 style={subtitleStyles}>AdMob performance</h2>
        <div style={textStyles}>No AdMob data for this range.</div>
      </section>
    );
  }

  const daily = report.app_daily;
  const impressionsSeries = daily.map((point) => ({
    label: point.date,
    value: point.impressions
  }));
  const earningsSeries = daily.map((point) => ({
    label: point.date,
    value: point.estimated_earnings_pkr
  }));

  const totalImpressions = daily.reduce(
    (sum, point) => sum + point.impressions,
    0
  );
  const totalClicks = daily.reduce((sum, point) => sum + point.clicks, 0);
  const totalEarnings = daily.reduce(
    (sum, point) => sum + point.estimated_earnings_pkr,
    0
  );
  const ctr =
    totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  const impressionWeightedEcpmTotal = daily.reduce(
    (sum, point) => sum + point.ecpm_pkr * point.impressions,
    0
  );
  const ecpm =
    totalImpressions > 0
      ? impressionWeightedEcpmTotal / totalImpressions
      : 0;

  const funnelSource = report.quiz_ad_performance;

  const avgQuestionsPerSession =
    funnelSource.length > 0
      ? funnelSource.reduce(
          (sum, point) => sum + point.avg_ads_per_session,
          0
        ) / funnelSource.length
      : 0;

  const totalSessions = funnelSource.reduce(
    (sum, point) => sum + point.total_sessions,
    0
  );

  const sessionsAfterFirstAd = funnelSource.reduce(
    (sum, point) => sum + point.sessions_after_first_ad,
    0
  );
  const sessionsAfterThirdAd = funnelSource.reduce(
    (sum, point) => sum + point.sessions_after_third_ad,
    0
  );
  const sessionsAfterFifthAd = funnelSource.reduce(
    (sum, point) => sum + point.sessions_after_fifth_ad,
    0
  );

  const funnelData =
    totalSessions > 0
      ? [
          {
            label: "Start",
            value: totalSessions
          },
          {
            label: "After 1st ad",
            value: sessionsAfterFirstAd
          },
          {
            label: "After 3rd ad",
            value: sessionsAfterThirdAd
          },
          {
            label: "After 5th ad",
            value: sessionsAfterFifthAd
          }
        ]
      : [];

  return (
    <section style={cardStyles}>
      <h2 style={subtitleStyles}>AdMob performance</h2>
      {!daily.length && (
        <div style={textStyles}>No AdMob data for this range.</div>
      )}
      {daily.length > 0 && (
        <>
          <div style={kpiGridStyles}>
            <KpiCard
              label="eCPM (PKR)"
              value={ecpm.toFixed(2)}
            />
            <KpiCard
              label="CTR"
              value={`${ctr.toFixed(2)}%`}
            />
            <KpiCard
              label="Total earnings (PKR)"
              value={totalEarnings.toFixed(0)}
            />
            <KpiCard
              label="Avg ads per session"
              value={avgQuestionsPerSession.toFixed(2)}
            />
          </div>
          <div style={chartRowStyles}>
            <div style={chartColumnStyles}>
              <div style={chartTitleStyles}>Impressions over time</div>
              <SimpleLineChart
                data={impressionsSeries}
                color="#6366f1"
              />
            </div>
            <div style={chartColumnStyles}>
              <div style={chartTitleStyles}>Earnings over time (PKR)</div>
              <SimpleLineChart
                data={earningsSeries}
                color="#f97316"
              />
            </div>
            <div style={chartColumnStyles}>
              <div style={chartTitleStyles}>Session drop-off funnel</div>
              <SimpleBarChart data={funnelData} />
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function RevenueAndPayoutSection(props: {
  revenueShare: RevenueShareReport | null;
  payouts: PayoutsReport | null;
}) {
  const { revenueShare, payouts } = props;

  if (!revenueShare || !payouts) {
    return (
      <section style={cardStyles}>
        <h2 style={subtitleStyles}>Revenue sharing and payouts</h2>
        <div style={textStyles}>
          No revenue or payout data for this range.
        </div>
      </section>
    );
  }

  const totalUserShare = revenueShare.revenue_share.reduce(
    (sum, point) => sum + point.user_share_pkr,
    0
  );
  const totalPlatformShare = revenueShare.revenue_share.reduce(
    (sum, point) => sum + point.platform_share_pkr,
    0
  );
  const totalShare = totalUserShare + totalPlatformShare;

  const userSharePercent =
    totalShare > 0 ? (totalUserShare / totalShare) * 100 : 0;
  const platformSharePercent =
    totalShare > 0 ? (totalPlatformShare / totalShare) * 100 : 0;

  const earningsByUser = new Map<string, number>();
  revenueShare.user_distribution.forEach((point) => {
    const previous = earningsByUser.get(point.user_id) || 0;
    earningsByUser.set(point.user_id, previous + point.total_share_pkr);
  });
  const topUsers = Array.from(earningsByUser.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const payoutPoints = payouts.payouts;

  const paidPoints = payoutPoints.filter(
    (point) => point.status.toLowerCase() === "paid"
  );
  const approvedPoints = payoutPoints.filter(
    (point) => point.status.toLowerCase() === "approved"
  );

  const paidSeries = paidPoints.map((point) => ({
    label: point.date,
    value: point.total_pkr
  }));
  const approvedSeries = approvedPoints.map((point) => ({
    label: point.date,
    value: point.total_pkr
  }));

  const totalPaidAmount = paidPoints.reduce(
    (sum, point) => sum + point.total_pkr,
    0
  );
  const totalPaidCount = paidPoints.reduce(
    (sum, point) => sum + point.requests_count,
    0
  );
  const averagePayoutAmount =
    totalPaidCount > 0 ? totalPaidAmount / totalPaidCount : 0;

  const slaPoints = payouts.sla;
  const totalPaidSla = slaPoints.reduce(
    (sum, point) =>
      sum + (point.avg_hours_to_paid || 0) * point.paid_count,
    0
  );
  const totalPaidSlaCount = slaPoints.reduce(
    (sum, point) => sum + point.paid_count,
    0
  );
  const avgHoursToPay =
    totalPaidSlaCount > 0 ? totalPaidSla / totalPaidSlaCount : 0;

  return (
    <section style={cardStyles}>
      <h2 style={subtitleStyles}>Revenue sharing and payouts</h2>
      <div style={revenueSectionContainerStyles}>
        <div style={revenueShareWrapperStyles}>
          <div style={chartTitleStyles}>User vs platform share (PKR)</div>
          {totalShare === 0 && (
            <div style={textStyles}>No revenue share data.</div>
          )}
          {totalShare > 0 && (
            <>
              <div style={stackedBarOuterStyles}>
                <div
                  style={{
                    ...stackedBarSegmentStyles,
                    width: `${userSharePercent}%`,
                    backgroundColor: "#10b981"
                  }}
                />
                <div
                  style={{
                    ...stackedBarSegmentStyles,
                    width: `${platformSharePercent}%`,
                    backgroundColor: "#6366f1"
                  }}
                />
              </div>
              <div style={stackedBarLegendStyles}>
                <span style={legendItemStyles}>
                  <span
                    style={{
                      ...legendSwatchStyles,
                      backgroundColor: "#10b981"
                    }}
                  />
                  User share {totalUserShare.toFixed(0)} PKR
                </span>
                <span style={legendItemStyles}>
                  <span
                    style={{
                      ...legendSwatchStyles,
                      backgroundColor: "#6366f1"
                    }}
                  />
                  Platform share {totalPlatformShare.toFixed(0)} PKR
                </span>
              </div>
            </>
          )}
          <div style={chartTitleStyles}>Top users by earnings</div>
          {topUsers.length === 0 && (
            <div style={textStyles}>No user earnings data.</div>
          )}
          {topUsers.length > 0 && (
            <table style={tableStyles}>
              <thead>
                <tr>
                  <th style={thStyles}>User</th>
                  <th style={thStyles}>Total earnings (PKR)</th>
                </tr>
              </thead>
              <tbody>
                {topUsers.map(([userId, total]) => (
                  <tr key={userId}>
                    <td style={tdStyles}>{userId}</td>
                    <td style={tdStyles}>{total.toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div style={payoutsWrapperStyles}>
          <div style={chartTitleStyles}>Payout trends</div>
          {!paidSeries.length && !approvedSeries.length && (
            <div style={textStyles}>No payout data.</div>
          )}
          {(paidSeries.length > 0 || approvedSeries.length > 0) && (
            <div style={chartRowStyles}>
              <div style={chartColumnStyles}>
                <div style={chartTitleStyles}>Approved payouts (PKR)</div>
                <SimpleLineChart
                  data={approvedSeries}
                  color="#f59e0b"
                />
              </div>
              <div style={chartColumnStyles}>
                <div style={chartTitleStyles}>Paid payouts (PKR)</div>
                <SimpleLineChart
                  data={paidSeries}
                  color="#22c55e"
                />
              </div>
            </div>
          )}
          <div style={kpiGridStyles}>
            <KpiCard
              label="Average payout amount (PKR)"
              value={averagePayoutAmount.toFixed(0)}
            />
            <KpiCard
              label="Average time to pay (hours)"
              value={avgHoursToPay.toFixed(1)}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default function AdminAnalyticsDashboardPage() {
  const [rangeKey, setRangeKey] = useState<TimeRangeKey>("last7");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [appId, setAppId] = useState("");
  const [quizId, setQuizId] = useState("");
  const [aiState, setAiState] = useState<AiState>("idle");
  const [aiError, setAiError] = useState("");
  const [aiResult, setAiResult] = useState("");

  const range = useMemo(() => {
    if (rangeKey === "custom" && customFrom && customTo) {
      return { from: customFrom, to: customTo };
    }
    return getPresetRange(rangeKey);
  }, [rangeKey, customFrom, customTo]);

  const userGrowthState = useAdminReport<UserGrowthReport>(
    "/api/app/admin/reporting/user-growth",
    {
      from: range.from,
      to: range.to
    }
  );

  const quizPerformanceState = useAdminReport<QuizPerformanceReport>(
    "/api/app/admin/reporting/quiz-performance",
    {
      from: range.from,
      to: range.to,
      quizId: quizId || null
    }
  );

  const admobState = useAdminReport<AdmobReport>(
    "/api/app/admin/reporting/admob",
    {
      from: range.from,
      to: range.to,
      appId: appId || null,
      quizId: quizId || null
    }
  );

  const revenueShareState = useAdminReport<RevenueShareReport>(
    "/api/app/admin/reporting/revenue-share",
    {
      from: range.from,
      to: range.to
    }
  );

  const payoutsState = useAdminReport<PayoutsReport>(
    "/api/app/admin/reporting/payouts",
    {
      from: range.from,
      to: range.to
    }
  );

  const keyKpis = computeKeyKpis(
    userGrowthState.data,
    admobState.data,
    revenueShareState.data,
    payoutsState.data
  );

  async function fetchAiSummary() {
    setAiState("loading");
    setAiError("");
    setAiResult("");

    try {
      const response = await fetch("/api/app/admin/ai/summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: range.from,
          to: range.to,
          appId: appId || null,
          quizId: quizId || null
        })
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const message =
          body && typeof body.error === "string"
            ? body.error
            : `Request failed with status ${response.status}`;
        setAiError(message);
        setAiState("error");
        return;
      }

      const json = await response.json();
      const text =
        json && typeof json.summary === "string"
          ? json.summary
          : JSON.stringify(json, null, 2);
      setAiResult(text);
      setAiState("success");
    } catch (error: any) {
      setAiError(error?.message || "Request failed");
      setAiState("error");
    }
  }

  const anyError =
    userGrowthState.error ||
    quizPerformanceState.error ||
    admobState.error ||
    revenueShareState.error ||
    payoutsState.error;

  const anyLoading =
    userGrowthState.loading ||
    quizPerformanceState.loading ||
    admobState.loading ||
    revenueShareState.loading ||
    payoutsState.loading;

  return (
    <>
      <Head>
        <title>Admin Analytics Dashboard</title>
      </Head>
      <main style={mainStyles}>
        <header>
          <h1 style={titleStyles}>Analytics overview</h1>
          <p style={textStyles}>
            High level health of the quiz business, for admin accounts only.
          </p>
        </header>

        <TimeRangeSelector
          rangeKey={rangeKey}
          onRangeKeyChange={setRangeKey}
          customFrom={customFrom}
          customTo={customTo}
          onCustomFromChange={setCustomFrom}
          onCustomToChange={setCustomTo}
        />

        <Filters
          appId={appId}
          quizId={quizId}
          onAppIdChange={setAppId}
          onQuizIdChange={setQuizId}
        />

        {anyError && (
          <section style={cardStyles}>
            <h2 style={subtitleStyles}>Errors</h2>
            <div style={errorStyles}>
              {userGrowthState.error && (
                <div>User growth: {userGrowthState.error}</div>
              )}
              {quizPerformanceState.error && (
                <div>Quiz performance: {quizPerformanceState.error}</div>
              )}
              {admobState.error && <div>AdMob: {admobState.error}</div>}
              {revenueShareState.error && (
                <div>Revenue share: {revenueShareState.error}</div>
              )}
              {payoutsState.error && (
                <div>Payouts: {payoutsState.error}</div>
              )}
            </div>
          </section>
        )}

        <KeyKpiSection kpis={keyKpis} loading={anyLoading} />
        <section style={cardStyles}>
          <h2 style={subtitleStyles}>AI performance summary</h2>
          <p style={textStyles}>
            Ask the AI copilot to summarize this dashboard for the selected time
            range and filters.
          </p>
          <div style={aiSummaryActionsRowStyles}>
            <button
              type="button"
              onClick={fetchAiSummary}
              style={aiSummaryButtonStyles}
              disabled={aiState === "loading"}
            >
              {aiState === "loading"
                ? "Generating AI summary..."
                : "Generate AI summary"}
            </button>
            <span style={aiSummaryHintStyles}>
              Uses only aggregated analytics; no raw user identifiers are sent
              to AI.
            </span>
          </div>
          {aiState === "error" && aiError && (
            <div style={errorStyles}>{aiError}</div>
          )}
          {aiState !== "idle" && (
            <pre style={aiSummaryPreStyles}>
              {aiState === "loading" && !aiResult
                ? "Waiting for AI response..."
                : aiResult}
            </pre>
          )}
        </section>
        <UserGrowthSection report={userGrowthState.data} />
        <QuizPerformanceSection report={quizPerformanceState.data} />
        <AdmobPerformanceSection report={admobState.data} />
        <RevenueAndPayoutSection
          revenueShare={revenueShareState.data}
          payouts={payoutsState.data}
        />
      </main>
    </>
  );
}

const mainStyles: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  justifyContent: "flex-start",
  fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  padding: "2rem",
  maxWidth: "1200px",
  margin: "0 auto",
  gap: "1.5rem",
  backgroundColor: "#f3f4f6"
};

const titleStyles: React.CSSProperties = {
  fontSize: "2rem",
  marginBottom: "0.25rem"
};

const subtitleStyles: React.CSSProperties = {
  fontSize: "1.25rem",
  marginBottom: "0.75rem"
};

const textStyles: React.CSSProperties = {
  fontSize: "0.95rem",
  color: "#4b5563"
};

const cardStyles: React.CSSProperties = {
  borderRadius: "0.75rem",
  border: "1px solid #e5e7eb",
  backgroundColor: "#ffffff",
  padding: "1.5rem",
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  display: "flex",
  flexDirection: "column",
  gap: "1rem"
};

const timeRangeRowStyles: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "1rem",
  alignItems: "center"
};

const rowStyles: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "1rem"
};

const labelStyles: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  flex: "1 1 220px",
  fontSize: "0.9rem",
  gap: "0.25rem"
};

const inlineLabelStyles: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  fontSize: "0.9rem",
  gap: "0.25rem"
};

const inputStyles: React.CSSProperties = {
  padding: "0.5rem 0.75rem",
  borderRadius: "0.375rem",
  border: "1px solid #d1d5db",
  fontSize: "0.9rem"
};

const errorStyles: React.CSSProperties = {
  padding: "0.75rem 1rem",
  borderRadius: "0.5rem",
  backgroundColor: "#fef2f2",
  color: "#b91c1c",
  fontSize: "0.9rem",
  border: "1px solid #fecaca",
  display: "flex",
  flexDirection: "column",
  gap: "0.25rem"
};

const kpiGridStyles: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: "1rem"
};

const kpiCardStyles: React.CSSProperties = {
  borderRadius: "0.75rem",
  border: "1px solid #e5e7eb",
  padding: "1rem",
  backgroundColor: "#f9fafb",
  display: "flex",
  flexDirection: "column",
  gap: "0.25rem"
};

const kpiLabelStyles: React.CSSProperties = {
  fontSize: "0.8rem",
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.05em"
};

const kpiValueStyles: React.CSSProperties = {
  fontSize: "1.3rem",
  fontWeight: 600,
  color: "#111827"
};

const chartRowStyles: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "1.5rem"
};

const chartColumnStyles: React.CSSProperties = {
  flex: "1 1 260px",
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem"
};

const chartTitleStyles: React.CSSProperties = {
  fontSize: "0.9rem",
  color: "#6b7280"
};

const chartSvgStyles: React.CSSProperties = {
  width: "100%",
  height: "72px",
  overflow: "visible"
};

const emptyChartStyles: React.CSSProperties = {
  borderRadius: "0.5rem",
  border: "1px dashed #e5e7eb",
  padding: "0.75rem",
  fontSize: "0.85rem",
  color: "#9ca3af",
  textAlign: "center"
};

const barChartContainerStyles: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  gap: "0.5rem",
  height: "90px"
};

const barChartBarWrapperStyles: React.CSSProperties = {
  flex: "1 1 0",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "0.25rem"
};

const barChartBarStyles: React.CSSProperties = {
  width: "100%",
  borderRadius: "0.25rem 0.25rem 0 0"
};

const barChartLabelStyles: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "#6b7280"
};

const tableStyles: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "0.85rem"
};

const thStyles: React.CSSProperties = {
  textAlign: "left",
  padding: "0.5rem 0.75rem",
  borderBottom: "1px solid #e5e7eb",
  fontWeight: 500,
  color: "#6b7280",
  backgroundColor: "#f9fafb"
};

const tdStyles: React.CSSProperties = {
  padding: "0.5rem 0.75rem",
  borderBottom: "1px solid #f3f4f6",
  color: "#111827"
};

const selectedRowStyles: React.CSSProperties = {
  backgroundColor: "#eef2ff",
  cursor: "pointer"
};

const quizSectionContainerStyles: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "1.5rem"
};

const quizTableWrapperStyles: React.CSSProperties = {
  flex: "2 1 360px",
  overflowX: "auto"
};

const quizDetailPanelStyles: React.CSSProperties = {
  flex: "1.5 1 320px",
  borderRadius: "0.75rem",
  border: "1px solid #e5e7eb",
  padding: "1rem",
  backgroundColor: "#f9fafb",
  display: "flex",
  flexDirection: "column",
  gap: "0.75rem"
};

const revenueSectionContainerStyles: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "1.5rem"
};

const revenueShareWrapperStyles: React.CSSProperties = {
  flex: "1.5 1 360px",
  display: "flex",
  flexDirection: "column",
  gap: "0.75rem"
};

const payoutsWrapperStyles: React.CSSProperties = {
  flex: "1.5 1 360px",
  display: "flex",
  flexDirection: "column",
  gap: "0.75rem"
};

const stackedBarOuterStyles: React.CSSProperties = {
  width: "100%",
  height: "18px",
  borderRadius: "999px",
  overflow: "hidden",
  backgroundColor: "#e5e7eb",
  display: "flex"
};

const stackedBarSegmentStyles: React.CSSProperties = {
  height: "100%"
};

const stackedBarLegendStyles: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.75rem",
  marginTop: "0.5rem",
  fontSize: "0.8rem",
  color: "#4b5563"
};

const legendItemStyles: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.35rem"
};

const legendSwatchStyles: React.CSSProperties = {
  width: "12px",
  height: "12px",
  borderRadius: "999px"
};

const aiSummaryActionsRowStyles: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "0.75rem"
};

const aiSummaryButtonStyles: React.CSSProperties = {
  padding: "0.45rem 1.1rem",
  borderRadius: "999px",
  border: "none",
  background:
    "linear-gradient(to right, #4f46e5, #6366f1)",
  color: "#ffffff",
  fontWeight: 500,
  fontSize: "0.9rem",
  cursor: "pointer"
};

const aiSummaryHintStyles: React.CSSProperties = {
  fontSize: "0.8rem",
  color: "#6b7280"
};

const aiSummaryPreStyles: React.CSSProperties = {
  marginTop: "0.5rem",
  padding: "1rem",
  borderRadius: "0.5rem",
  backgroundColor: "#111827",
  color: "#e5e7eb",
  fontSize: "0.9rem",
  maxHeight: "360px",
  overflow: "auto",
  whiteSpace: "pre-wrap"
};

