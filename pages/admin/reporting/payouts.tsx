import Head from "next/head";
import { useEffect, useMemo, useState } from "react";

type TimeRangeKey = "today" | "yesterday" | "last7" | "last30" | "custom";

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

export default function AdminPayoutAnalyticsPage() {
  const [rangeKey, setRangeKey] = useState<TimeRangeKey>("last30");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const range = useMemo(() => {
    if (rangeKey === "custom" && customFrom && customTo) {
      return { from: customFrom, to: customTo };
    }
    return getPresetRange(rangeKey);
  }, [rangeKey, customFrom, customTo]);

  const reportState = useAdminReport<PayoutsReport>(
    "/api/app/admin/reporting/payouts",
    {
      from: range.from,
      to: range.to
    }
  );

  const anyLoading = reportState.loading;
  const anyError = reportState.error;

  const payouts = reportState.data?.payouts ?? [];
  const methods = reportState.data?.methods ?? [];
  const sla = reportState.data?.sla ?? [];
  const cashflow = reportState.data?.cashflow ?? [];

  const monthlyCashflow = useMemo(() => {
    const grouped = new Map<
      string,
      { month: string; inflow: number; outflow: number }
    >();
    cashflow.forEach((point) => {
      const monthKey = point.date.slice(0, 7);
      const existing = grouped.get(monthKey);
      if (!existing) {
        grouped.set(monthKey, {
          month: monthKey,
          inflow: point.admob_inflow_pkr,
          outflow: point.payouts_outflow_pkr
        });
      } else {
        grouped.set(monthKey, {
          month: existing.month,
          inflow: existing.inflow + point.admob_inflow_pkr,
          outflow: existing.outflow + point.payouts_outflow_pkr
        });
      }
    });
    return Array.from(grouped.values()).sort((a, b) =>
      a.month.localeCompare(b.month)
    );
  }, [cashflow]);

  const inflowSeries = monthlyCashflow.map((point) => ({
    label: point.month,
    value: point.inflow
  }));

  const outflowSeries = monthlyCashflow.map((point) => ({
    label: point.month,
    value: point.outflow
  }));

  const methodBreakdown = useMemo(() => {
    const grouped = new Map<
      string,
      { method: string; amount: number }
    >();
    methods.forEach((point) => {
      if (point.status.toLowerCase() !== "paid") {
        return;
      }
      const existing = grouped.get(point.method) || {
        method: point.method,
        amount: 0
      };
      existing.amount += point.total_pkr;
      grouped.set(point.method, existing);
    });
    return Array.from(grouped.values());
  }, [methods]);

  const methodBars = methodBreakdown.map((entry) => ({
    label: entry.method,
    value: entry.amount
  }));

  const slaSeries = sla.map((point) => ({
    label: point.date,
    value: point.avg_hours_to_paid || 0
  }));

  const totalPaid = payouts
    .filter((point) => point.status.toLowerCase() === "paid")
    .reduce(
      (sum, point) => ({
        count: sum.count + point.requests_count,
        amount: sum.amount + point.total_pkr
      }),
      { count: 0, amount: 0 }
    );

  const averagePayout =
    totalPaid.count > 0 ? totalPaid.amount / totalPaid.count : 0;

  return (
    <>
      <Head>
        <title>Payout and cashflow analytics</title>
      </Head>
      <main style={mainStyles}>
        <header>
          <h1 style={titleStyles}>Payout and cashflow analytics</h1>
          <p style={textStyles}>
            Understand how AdMob income compares to payouts and how fast users
            are paid.
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
        </section>

        {anyError && (
          <section style={cardStyles}>
            <h2 style={subtitleStyles}>Errors</h2>
            <div style={errorStyles}>{anyError}</div>
          </section>
        )}

        <section style={cardStyles}>
          <h2 style={subtitleStyles}>Monthly payouts vs AdMob income</h2>
          {anyLoading && !monthlyCashflow.length && (
            <div style={textStyles}>Loading...</div>
          )}
          {!anyLoading && monthlyCashflow.length === 0 && (
            <div style={textStyles}>
              No cashflow stats for this selection.
            </div>
          )}
          {monthlyCashflow.length > 0 && (
            <div style={chartRowStyles}>
              <div style={chartColumnStyles}>
                <div style={chartTitleStyles}>AdMob income (PKR)</div>
                <SimpleLineChart
                  data={inflowSeries}
                  color="#22c55e"
                />
              </div>
              <div style={chartColumnStyles}>
                <div style={chartTitleStyles}>Payouts (PKR)</div>
                <SimpleLineChart
                  data={outflowSeries}
                  color="#ef4444"
                />
              </div>
            </div>
          )}
        </section>

        <section style={cardStyles}>
          <h2 style={subtitleStyles}>Payout methods</h2>
          {methodBars.length === 0 && (
            <div style={textStyles}>
              No paid payouts for this selection.
            </div>
          )}
          {methodBars.length > 0 && (
            <SimpleBarChart
              data={methodBars}
              colors={["#0ea5e9", "#f97316", "#a855f7"]}
            />
          )}
        </section>

        <section style={cardStyles}>
          <h2 style={subtitleStyles}>Payout SLAs</h2>
          {slaSeries.length === 0 && (
            <div style={textStyles}>
              No SLA stats for this selection.
            </div>
          )}
          {slaSeries.length > 0 && (
            <SimpleLineChart
              data={slaSeries}
              color="#6366f1"
            />
          )}
          <div style={kpiRowStyles}>
            <div style={kpiCardStyles}>
              <div style={kpiLabelStyles}>Average payout amount (PKR)</div>
              <div style={kpiValueStyles}>{averagePayout.toFixed(0)}</div>
            </div>
          </div>
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

const kpiRowStyles: React.CSSProperties = {
  marginTop: "1rem",
  display: "flex",
  flexWrap: "wrap",
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
  fontSize: "0.85rem",
  color: "#6b7280"
};

const kpiValueStyles: React.CSSProperties = {
  fontSize: "1.3rem",
  fontWeight: 600,
  color: "#111827"
};

