import Head from "next/head";
import { useEffect, useMemo, useState } from "react";

type TimeRangeKey = "today" | "yesterday" | "last7" | "last30" | "custom";

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
  app_daily: unknown[];
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

type AggregatedQuizRow = {
  quizId: string;
  title: string;
  difficulty: string;
  totalSessions: number;
  completionRate: number;
  avgScore: number;
  avgCoins: number;
  avgAdsPerSession: number;
};

export default function AdminQuizAnalyticsPage() {
  const [rangeKey, setRangeKey] = useState<TimeRangeKey>("last7");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [search, setSearch] = useState("");

  const range = useMemo(() => {
    if (rangeKey === "custom" && customFrom && customTo) {
      return { from: customFrom, to: customTo };
    }
    return getPresetRange(rangeKey);
  }, [rangeKey, customFrom, customTo]);

  const quizPerformanceState = useAdminReport<QuizPerformanceReport>(
    "/api/app/admin/reporting/quiz-performance",
    {
      from: range.from,
      to: range.to
    }
  );

  const admobState = useAdminReport<AdmobReport>(
    "/api/app/admin/reporting/admob",
    {
      from: range.from,
      to: range.to
    }
  );

  const rows: AggregatedQuizRow[] = useMemo(() => {
    if (!quizPerformanceState.data) {
      return [];
    }
    const performance = quizPerformanceState.data.points;
    const ads = admobState.data?.quiz_ad_performance ?? [];
    const adsByQuiz = new Map<string, QuizAdPerformancePoint[]>();
    ads.forEach((point) => {
      const list = adsByQuiz.get(point.quiz_id) || [];
      list.push(point);
      adsByQuiz.set(point.quiz_id, list);
    });
    const byQuiz = new Map<string, AggregatedQuizRow>();
    performance.forEach((point) => {
      const existing = byQuiz.get(point.quiz_id);
      if (!existing) {
        byQuiz.set(point.quiz_id, {
          quizId: point.quiz_id,
          title: point.title || point.quiz_id,
          difficulty: point.difficulty || "",
          totalSessions: point.sessions_started,
          completionRate: point.completion_rate,
          avgScore: point.avg_correct_answers,
          avgCoins: point.avg_coins_earned,
          avgAdsPerSession: 0
        });
      } else {
        const totalSessions = existing.totalSessions + point.sessions_started;
        const completed =
          existing.completionRate * existing.totalSessions +
          point.completion_rate * point.sessions_started;
        const avgScoreTotal =
          existing.avgScore * existing.totalSessions +
          point.avg_correct_answers * point.sessions_started;
        const avgCoinsTotal =
          existing.avgCoins * existing.totalSessions +
          point.avg_coins_earned * point.sessions_started;
        byQuiz.set(point.quiz_id, {
          ...existing,
          totalSessions,
          completionRate:
            totalSessions > 0 ? completed / totalSessions : 0,
          avgScore: totalSessions > 0 ? avgScoreTotal / totalSessions : 0,
          avgCoins: totalSessions > 0 ? avgCoinsTotal / totalSessions : 0
        });
      }
    });

    byQuiz.forEach((row, quizId) => {
      const quizAds = adsByQuiz.get(quizId) || [];
      if (quizAds.length === 0) {
        return;
      }
      const totalSessions = quizAds.reduce(
        (sum, point) => sum + point.total_sessions,
        0
      );
      const weightedAds = quizAds.reduce(
        (sum, point) =>
          sum + point.avg_ads_per_session * point.total_sessions,
        0
      );
      const avgAdsPerSession =
        totalSessions > 0 ? weightedAds / totalSessions : 0;
      byQuiz.set(quizId, {
        ...row,
        avgAdsPerSession
      });
    });

    let list = Array.from(byQuiz.values());

    if (difficultyFilter) {
      const value = difficultyFilter.toLowerCase();
      list = list.filter(
        (row) => row.difficulty.toLowerCase() === value
      );
    }

    if (categoryFilter) {
      const value = categoryFilter.toLowerCase();
      list = list.filter((row) =>
        row.title.toLowerCase().includes(value)
      );
    }

    if (search) {
      const value = search.toLowerCase();
      list = list.filter(
        (row) =>
          row.title.toLowerCase().includes(value) ||
          row.quizId.toLowerCase().includes(value)
      );
    }

    list.sort((a, b) => b.totalSessions - a.totalSessions);
    return list;
  }, [
    quizPerformanceState.data,
    admobState.data,
    difficultyFilter,
    categoryFilter,
    search
  ]);

  const anyLoading = quizPerformanceState.loading || admobState.loading;
  const anyError = quizPerformanceState.error || admobState.error;

  return (
    <>
      <Head>
        <title>Quiz analytics</title>
      </Head>
      <main style={mainStyles}>
        <header>
          <h1 style={titleStyles}>Quiz analytics</h1>
          <p style={textStyles}>
            Compare quizzes by sessions, completion rate, score, coins and ads
            per session.
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
          </div>
          <div style={filtersRowStyles}>
            <label style={labelStyles}>
              Category
              <input
                type="text"
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(event.target.value)
                }
                style={inputStyles}
                placeholder="Search by category or topic"
              />
            </label>
            <label style={labelStyles}>
              Difficulty
              <select
                value={difficultyFilter}
                onChange={(event) =>
                  setDifficultyFilter(event.target.value)
                }
                style={inputStyles}
              >
                <option value="">All</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>
            <label style={labelStyles}>
              Search
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                style={inputStyles}
                placeholder="Filter by quiz title or ID"
              />
            </label>
          </div>
        </section>

        {anyError && (
          <section style={cardStyles}>
            <h2 style={subtitleStyles}>Errors</h2>
            <div style={errorStyles}>
              {quizPerformanceState.error && (
                <div>Quiz performance: {quizPerformanceState.error}</div>
              )}
              {admobState.error && <div>AdMob: {admobState.error}</div>}
            </div>
          </section>
        )}

        <section style={cardStyles}>
          <h2 style={subtitleStyles}>Quizzes</h2>
          {anyLoading && !rows.length && (
            <div style={textStyles}>Loading...</div>
          )}
          {!anyLoading && rows.length === 0 && (
            <div style={textStyles}>
              No quiz analytics available for this selection.
            </div>
          )}
          {rows.length > 0 && (
            <div style={tableWrapperStyles}>
              <table style={tableStyles}>
                <thead>
                  <tr>
                    <th style={thStyles}>Quiz</th>
                    <th style={thStyles}>Difficulty</th>
                    <th style={thStyles}>Sessions</th>
                    <th style={thStyles}>Completion rate</th>
                    <th style={thStyles}>Avg score</th>
                    <th style={thStyles}>Avg coins</th>
                    <th style={thStyles}>Avg ads/session</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.quizId}>
                      <td style={tdStyles}>{row.title}</td>
                      <td style={tdStyles}>{row.difficulty || "-"}</td>
                      <td style={tdStyles}>
                        {row.totalSessions.toLocaleString()}
                      </td>
                      <td style={tdStyles}>
                        {(row.completionRate * 100).toFixed(1)}%
                      </td>
                      <td style={tdStyles}>
                        {row.avgScore.toFixed(2)}
                      </td>
                      <td style={tdStyles}>
                        {row.avgCoins.toFixed(2)}
                      </td>
                      <td style={tdStyles}>
                        {row.avgAdsPerSession.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
  border: "1px solid #fecaca",
  display: "flex",
  flexDirection: "column",
  gap: "0.25rem"
};

const tableWrapperStyles: React.CSSProperties = {
  width: "100%",
  overflowX: "auto"
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
  color: "#111827",
  whiteSpace: "nowrap"
};

