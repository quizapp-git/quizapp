import Head from "next/head";
import { useEffect, useMemo, useState } from "react";

type TimeRangeKey = "today" | "yesterday" | "last7" | "last30" | "custom";

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

type AdminReportParams = Record<string, string | null | undefined>;

type FetchState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
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

export default function AdminMonetizationAnalyticsPage() {
  const [rangeKey, setRangeKey] = useState<TimeRangeKey>("last30");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [appFilter, setAppFilter] = useState("");

  const range = useMemo(() => {
    if (rangeKey === "custom" && customFrom && customTo) {
      return { from: customFrom, to: customTo };
    }
    return getPresetRange(rangeKey);
  }, [rangeKey, customFrom, customTo]);

  const reportState = useAdminReport<AdmobReport>(
    "/api/app/admin/reporting/admob",
    {
      from: range.from,
      to: range.to,
      appId: appFilter || null
    }
  );

  const anyLoading = reportState.loading;
  const anyError = reportState.error;

  const appDaily = reportState.data?.app_daily ?? [];
  const quizPerformance = reportState.data?.quiz_ad_performance ?? [];

  const apps = Array.from(
    new Set(appDaily.map((point) => point.app_id))
  ).sort();

  const dailyByDate = useMemo(() => {
    const grouped = new Map<
      string,
      { date: string; impressions: number; earnings: number }
    >();
    appDaily.forEach((point) => {
      const key = point.date;
      const existing = grouped.get(key);
      if (!existing) {
        grouped.set(key, {
          date: point.date,
          impressions: point.impressions,
          earnings: point.estimated_earnings_pkr
        });
      } else {
        grouped.set(key, {
          date: existing.date,
          impressions: existing.impressions + point.impressions,
          earnings: existing.earnings + point.estimated_earnings_pkr
        });
      }
    });
    return Array.from(grouped.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }, [appDaily]);

  const impressionsSeries = dailyByDate.map((point) => ({
    label: point.date,
    value: point.impressions
  }));

  const earningsSeries = dailyByDate.map((point) => ({
    label: point.date,
    value: point.earnings
  }));

  const ecpmByApp = useMemo(() => {
    const byApp = new Map<
      string,
      { impressions: number; weightedEcpm: number }
    >();
    appDaily.forEach((point) => {
      const existing = byApp.get(point.app_id);
      if (!existing) {
        byApp.set(point.app_id, {
          impressions: point.impressions,
          weightedEcpm: point.ecpm_pkr * point.impressions
        });
      } else {
        byApp.set(point.app_id, {
          impressions: existing.impressions + point.impressions,
          weightedEcpm:
            existing.weightedEcpm + point.ecpm_pkr * point.impressions
        });
      }
    });
    return Array.from(byApp.entries()).map(([appId, value]) => ({
      appId,
      ecpm:
        value.impressions > 0
          ? value.weightedEcpm / value.impressions
          : 0
    }));
  }, [appDaily]);

  const ecpmBars = ecpmByApp.map((entry) => ({
    label: entry.appId,
    value: entry.ecpm
  }));

  const distributionBars = useMemo(() => {
    if (!quizPerformance.length) {
      return [];
    }
    let sessions1to3 = 0;
    let sessions4to6 = 0;
    let sessions7plus = 0;
    quizPerformance.forEach((point) => {
      const total = point.total_sessions;
      const afterFirst = point.sessions_after_first_ad;
      const afterThird = point.sessions_after_third_ad;
      const afterFifth = point.sessions_after_fifth_ad;
      const oneToThree = afterFirst - afterThird;
      const fourToSix = afterThird - afterFifth;
      const sevenPlus = afterFifth;
      sessions1to3 += Math.max(oneToThree, 0);
      sessions4to6 += Math.max(fourToSix, 0);
      sessions7plus += Math.max(sevenPlus, 0);
      if (total > afterFirst) {
        sessions1to3 += total - afterFirst;
      }
    });
    return [
      { label: "1–3 ads", value: sessions1to3 },
      { label: "4–6 ads", value: sessions4to6 },
      { label: "7+ ads", value: sessions7plus }
    ];
  }, [quizPerformance]);

  return (
    <>
      <Head>
        <title>Monetization analytics</title>
      </Head>
      <main style={mainStyles}>
        <header>
          <h1 style={titleStyles}>AdMob and monetization analytics</h1>
          <p style={textStyles}>
            Track eCPM, earnings and ad load across apps and quizzes.
          </p>
        </header>

        <section style={cardStyles}>
          <h2 style={subtitleStyles}>Filters</h2>
          <div style={filtersRowStyles}>
            <label style={labelStyles}>
              Time range
              <select
                value={rangeKey}
                onChange={(event) =>
                  setRangeKey(event.target.value as TimeRangeKey)
                }
                style={inputStyles}
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="last7">Last 7 days</option>
                <option value="last30">Last 30 days</option>
                <option value="custom">Custom range</option>
              </select>
            </label>
            {rangeKey === "custom" && (
              <>
                <label style={labelStyles}>
                  From
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(event) =>
                      setCustomFrom(event.target.value)
                    }
                    style={inputStyles}
                  />
                </label>
                <label style={labelStyles}>
                  To
                  <input
                    type="date"
                    value={customTo}
                    onChange={(event) =>
                      setCustomTo(event.target.value)
                    }
                    style={inputStyles}
                  />
                </label>
              </>
            )}
            <label style={labelStyles}>
              AdMob app
              <select
                value={appFilter}
                onChange={(event) => setAppFilter(event.target.value)}
                style={inputStyles}
              >
                <option value="">All apps</option>
                {apps.map((appId) => (
                  <option key={appId} value={appId}>
                    {appId}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        {anyError && (
          <section style={cardStyles}>
            <h2 style={subtitleStyles}>Errors</h2>
            <div style={errorStyles}>{anyError}</div>
          </section>
        )}

        <section style={cardStyles}>
          <h2 style={subtitleStyles}>AdMob performance over time</h2>
          {anyLoading && !dailyByDate.length && (
            <div style={textStyles}>Loading...</div>
          )}
          {!anyLoading && dailyByDate.length === 0 && (
            <div style={textStyles}>No AdMob stats for this selection.</div>
          )}
          {dailyByDate.length > 0 && (
            <div style={chartRowStyles}>
              <div style={chartColumnStyles}>
                <div style={chartTitleStyles}>Impressions</div>
                <SimpleLineChart
                  data={impressionsSeries}
                  color="#6366f1"
                />
              </div>
              <div style={chartColumnStyles}>
                <div style={chartTitleStyles}>Earnings (PKR)</div>
                <SimpleLineChart
                  data={earningsSeries}
                  color="#f97316"
                />
              </div>
            </div>
          )}
        </section>

        <section style={cardStyles}>
          <h2 style={subtitleStyles}>eCPM by app</h2>
          {ecpmBars.length === 0 && (
            <div style={textStyles}>No app-level eCPM stats.</div>
          )}
          {ecpmBars.length > 0 && (
            <SimpleBarChart data={ecpmBars} />
          )}
        </section>

        <section style={cardStyles}>
          <h2 style={subtitleStyles}>Ads per session distribution</h2>
          {distributionBars.length === 0 && (
            <div style={textStyles}>
              No quiz ad performance data for this selection.
            </div>
          )}
          {distributionBars.length > 0 && (
            <SimpleBarChart
              data={distributionBars}
              colors={["#22c55e", "#f97316", "#ef4444"]}
            />
          )}
        </section>
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

const filtersRowStyles: React.CSSProperties = {
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
  border: "1px solid #fecaca"
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

