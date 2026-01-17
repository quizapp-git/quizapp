import Head from "next/head";
import { useEffect, useMemo, useState } from "react";

type UserEarningsPoint = {
  date: string;
  user_id: string;
  total_share_pkr: number;
  total_share_coins: number;
};

type RevenueShareReport = {
  range: { from: string; to: string };
  revenue_share: unknown[];
  user_distribution: UserEarningsPoint[];
  coin_liability: unknown[];
  coin_velocity: unknown[];
};

type TimeRangeKey = "today" | "yesterday" | "last7" | "last30" | "custom";

type AdminReportParams = Record<string, string | null | undefined>;

type FetchState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

type UserRow = {
  userId: string;
  totalSharePkr: number;
  totalShareCoins: number;
  segment: "power" | "casual" | "dormant";
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

export default function AdminUserAnalyticsPage() {
  const [rangeKey, setRangeKey] = useState<TimeRangeKey>("last30");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [segmentFilter, setSegmentFilter] = useState<
    "all" | "power" | "casual" | "dormant"
  >("all");
  const [search, setSearch] = useState("");

  const range = useMemo(() => {
    if (rangeKey === "custom" && customFrom && customTo) {
      return { from: customFrom, to: customTo };
    }
    return getPresetRange(rangeKey);
  }, [rangeKey, customFrom, customTo]);

  const revenueShareState = useAdminReport<RevenueShareReport>(
    "/api/app/admin/reporting/revenue-share",
    {
      from: range.from,
      to: range.to
    }
  );

  const rows: UserRow[] = useMemo(() => {
    if (!revenueShareState.data) {
      return [];
    }
    const distribution = revenueShareState.data.user_distribution;
    const byUser = new Map<string, UserRow>();
    distribution.forEach((point) => {
      const existing = byUser.get(point.user_id);
      if (!existing) {
        const totalSharePkr = point.total_share_pkr;
        const totalShareCoins = point.total_share_coins;
        let segment: UserRow["segment"];
        if (totalSharePkr >= 10000) {
          segment = "power";
        } else if (totalSharePkr > 0) {
          segment = "casual";
        } else {
          segment = "dormant";
        }
        byUser.set(point.user_id, {
          userId: point.user_id,
          totalSharePkr,
          totalShareCoins,
          segment
        });
      } else {
        const totalSharePkr =
          existing.totalSharePkr + point.total_share_pkr;
        const totalShareCoins =
          existing.totalShareCoins + point.total_share_coins;
        let segment: UserRow["segment"];
        if (totalSharePkr >= 10000) {
          segment = "power";
        } else if (totalSharePkr > 0) {
          segment = "casual";
        } else {
          segment = "dormant";
        }
        byUser.set(point.user_id, {
          userId: point.user_id,
          totalSharePkr,
          totalShareCoins,
          segment
        });
      }
    });
    let list = Array.from(byUser.values());

    if (segmentFilter !== "all") {
      list = list.filter((row) => row.segment === segmentFilter);
    }

    if (search) {
      const value = search.toLowerCase();
      list = list.filter((row) =>
        row.userId.toLowerCase().includes(value)
      );
    }

    list.sort((a, b) => b.totalSharePkr - a.totalSharePkr);
    return list;
  }, [revenueShareState.data, segmentFilter, search]);

  function handleExport() {
    if (!rows.length) {
      return;
    }
    const header = [
      "user_id",
      "total_share_pkr",
      "total_share_coins",
      "segment"
    ];
    const lines = [header.join(",")];
    rows.forEach((row) => {
      lines.push(
        [
          row.userId,
          row.totalSharePkr.toString(),
          row.totalShareCoins.toString(),
          row.segment
        ].join(",")
      );
    });
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "user_segments.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const anyLoading = revenueShareState.loading;
  const anyError = revenueShareState.error;

  const powerCount = rows.filter((row) => row.segment === "power").length;
  const casualCount = rows.filter((row) => row.segment === "casual").length;
  const dormantCount = rows.filter((row) => row.segment === "dormant").length;

  return (
    <>
      <Head>
        <title>User analytics</title>
      </Head>
      <main style={mainStyles}>
        <header>
          <h1 style={titleStyles}>User analytics</h1>
          <p style={textStyles}>
            See which users earn the most, segment your base and export
            segments.
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
              Segment
              <select
                value={segmentFilter}
                onChange={(event) =>
                  setSegmentFilter(
                    event.target.value as UserRow["segment"] | "all"
                  )
                }
                style={inputStyles}
              >
                <option value="all">All users</option>
                <option value="power">Power users</option>
                <option value="casual">Casual users</option>
                <option value="dormant">Dormant users</option>
              </select>
            </label>
            <label style={labelStyles}>
              Search
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                style={inputStyles}
                placeholder="Filter by user ID"
              />
            </label>
          </div>
          <div style={actionsRowStyles}>
            <button
              type="button"
              onClick={handleExport}
              style={buttonStyles}
              disabled={!rows.length}
            >
              Export segment as CSV
            </button>
          </div>
        </section>

        {anyError && (
          <section style={cardStyles}>
            <h2 style={subtitleStyles}>Errors</h2>
            <div style={errorStyles}>{anyError}</div>
          </section>
        )}

        <section style={cardStyles}>
          <h2 style={subtitleStyles}>Segments overview</h2>
          <div style={segmentGridStyles}>
            <div style={segmentCardStyles}>
              <div style={segmentLabelStyles}>Power users</div>
              <div style={segmentValueStyles}>{powerCount}</div>
            </div>
            <div style={segmentCardStyles}>
              <div style={segmentLabelStyles}>Casual users</div>
              <div style={segmentValueStyles}>{casualCount}</div>
            </div>
            <div style={segmentCardStyles}>
              <div style={segmentLabelStyles}>Dormant users</div>
              <div style={segmentValueStyles}>{dormantCount}</div>
            </div>
          </div>
        </section>

        <section style={cardStyles}>
          <h2 style={subtitleStyles}>Users</h2>
          {anyLoading && !rows.length && (
            <div style={textStyles}>Loading...</div>
          )}
          {!anyLoading && rows.length === 0 && (
            <div style={textStyles}>
              No users in this segment and time range.
            </div>
          )}
          {rows.length > 0 && (
            <div style={tableWrapperStyles}>
              <table style={tableStyles}>
                <thead>
                  <tr>
                    <th style={thStyles}>User</th>
                    <th style={thStyles}>Segment</th>
                    <th style={thStyles}>Total earnings (PKR)</th>
                    <th style={thStyles}>Total coins</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.userId}>
                      <td style={tdStyles}>{row.userId}</td>
                      <td style={tdStyles}>{row.segment}</td>
                      <td style={tdStyles}>
                        {row.totalSharePkr.toFixed(0)}
                      </td>
                      <td style={tdStyles}>
                        {row.totalShareCoins.toFixed(0)}
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

const actionsRowStyles: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end"
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

const buttonStyles: React.CSSProperties = {
  padding: "0.5rem 1.25rem",
  borderRadius: "0.375rem",
  border: "none",
  backgroundColor: "#111827",
  color: "#ffffff",
  fontSize: "0.9rem",
  cursor: "pointer"
};

const errorStyles: React.CSSProperties = {
  padding: "0.75rem 1rem",
  borderRadius: "0.5rem",
  backgroundColor: "#fef2f2",
  color: "#b91c1c",
  fontSize: "0.9rem",
  border: "1px solid #fecaca"
};

const segmentGridStyles: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "1rem"
};

const segmentCardStyles: React.CSSProperties = {
  borderRadius: "0.75rem",
  border: "1px solid #e5e7eb",
  padding: "1rem",
  backgroundColor: "#f9fafb",
  display: "flex",
  flexDirection: "column",
  gap: "0.25rem"
};

const segmentLabelStyles: React.CSSProperties = {
  fontSize: "0.85rem",
  color: "#6b7280"
};

const segmentValueStyles: React.CSSProperties = {
  fontSize: "1.3rem",
  fontWeight: 600,
  color: "#111827"
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

