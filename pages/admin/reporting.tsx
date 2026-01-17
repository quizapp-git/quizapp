import Head from "next/head";
import { useState } from "react";

type ReportType =
  | "user-growth"
  | "quiz-performance"
  | "admob"
  | "revenue-share"
  | "payouts";

type FetchState = "idle" | "loading" | "error" | "success";

export default function AdminReportingPage() {
  const [token, setToken] = useState("");
  const [reportType, setReportType] = useState<ReportType>("user-growth");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [quizId, setQuizId] = useState("");
  const [appId, setAppId] = useState("");
  const [state, setState] = useState<FetchState>("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<unknown>(null);

  async function fetchReport(event: React.FormEvent) {
    event.preventDefault();

    setState("loading");
    setError("");
    setResult(null);

    let path = "";

    if (reportType === "user-growth") {
      path = "/api/app/admin/reporting/user-growth";
    } else if (reportType === "quiz-performance") {
      path = "/api/app/admin/reporting/quiz-performance";
    } else if (reportType === "admob") {
      path = "/api/app/admin/reporting/admob";
    } else if (reportType === "revenue-share") {
      path = "/api/app/admin/reporting/revenue-share";
    } else if (reportType === "payouts") {
      path = "/api/app/admin/reporting/payouts";
    }

    const url = new URL(path, window.location.origin);

    if (from) {
      url.searchParams.set("from", from);
    }

    if (to) {
      url.searchParams.set("to", to);
    }

    if (reportType === "quiz-performance" && quizId) {
      url.searchParams.set("quizId", quizId);
    }

    if (reportType === "admob") {
      if (appId) {
        url.searchParams.set("appId", appId);
      }

      if (quizId) {
        url.searchParams.set("quizId", quizId);
      }
    }

    try {
      const response = await fetch(url.toString(), {
        headers: token
          ? {
              Authorization: `Bearer ${token}`
            }
          : undefined
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const message =
          body && typeof body.error === "string"
            ? body.error
            : `Request failed with status ${response.status}`;
        setError(message);
        setState("error");
        return;
      }

      const json = await response.json();
      setResult(json);
      setState("success");
    } catch (err: any) {
      setError(err?.message || "Request failed");
      setState("error");
    }
  }

  return (
    <>
      <Head>
        <title>Admin Reporting</title>
      </Head>
      <main style={mainStyles}>
        <h1 style={titleStyles}>Admin Reporting Dashboard</h1>
        <p style={textStyles}>
          Use this page to call backend analytics APIs with an admin token.
        </p>
        <nav style={navStyles}>
          <a href="/admin/dashboard/analytics" style={navLinkStyles}>
            Analytics overview
          </a>
          <a href="/admin/reporting/quizzes" style={navLinkStyles}>
            Quiz analytics
          </a>
          <a href="/admin/reporting/users" style={navLinkStyles}>
            User analytics
          </a>
          <a href="/admin/reporting/monetization" style={navLinkStyles}>
            Monetization analytics
          </a>
          <a href="/admin/reporting/payouts" style={navLinkStyles}>
            Payout analytics
          </a>
          <a href="/admin/ai-insights" style={navLinkStyles}>
            AI insights and revenue copilot
          </a>
          <a href="/admin/communication-policy" style={navLinkStyles}>
            Communication policy
          </a>
        </nav>

        <form onSubmit={fetchReport} style={formStyles}>
          <label style={labelStyles}>
            Supabase access token
            <input
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              style={inputStyles}
              placeholder="Bearer token for admin user"
            />
          </label>

          <label style={labelStyles}>
            Report type
            <select
              value={reportType}
              onChange={(event) =>
                setReportType(event.target.value as ReportType)
              }
              style={inputStyles}
            >
              <option value="user-growth">User growth and retention</option>
              <option value="quiz-performance">Quiz performance</option>
              <option value="admob">AdMob and ad performance</option>
              <option value="revenue-share">Revenue share and wallet</option>
              <option value="payouts">Payouts and cashflow</option>
            </select>
          </label>

          <div style={rowStyles}>
            <label style={labelStyles}>
              From date
              <input
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                style={inputStyles}
              />
            </label>
            <label style={labelStyles}>
              To date
              <input
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                style={inputStyles}
              />
            </label>
          </div>

          <div style={rowStyles}>
            <label style={labelStyles}>
              Quiz ID
              <input
                type="text"
                value={quizId}
                onChange={(event) => setQuizId(event.target.value)}
                style={inputStyles}
                placeholder="Optional, for quiz-specific reports"
              />
            </label>
            <label style={labelStyles}>
              AdMob app ID
              <input
                type="text"
                value={appId}
                onChange={(event) => setAppId(event.target.value)}
                style={inputStyles}
                placeholder="Optional, for AdMob reports"
              />
            </label>
          </div>

          <button
            type="submit"
            style={buttonStyles}
            disabled={state === "loading"}
          >
            {state === "loading" ? "Loading..." : "Fetch report"}
          </button>
        </form>

        {state === "error" && error && (
          <div style={errorStyles}>{error}</div>
        )}

        {state === "success" && result != null && (
          <section style={resultSectionStyles}>
            <h2 style={subtitleStyles}>Result</h2>
            <pre style={preStyles}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </section>
        )}
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
  maxWidth: "960px",
  margin: "0 auto",
  gap: "1.5rem"
};

const titleStyles: React.CSSProperties = {
  fontSize: "2rem",
  marginBottom: "0.25rem"
};

const subtitleStyles: React.CSSProperties = {
  fontSize: "1.25rem",
  marginBottom: "0.5rem"
};

const textStyles: React.CSSProperties = {
  fontSize: "0.95rem",
  color: "#555"
};

const formStyles: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
  padding: "1.5rem",
  borderRadius: "0.5rem",
  border: "1px solid #ddd",
  backgroundColor: "#fafafa"
};

const rowStyles: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "1rem"
};

const labelStyles: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  flex: "1 1 200px",
  fontSize: "0.9rem",
  gap: "0.25rem"
};

const inputStyles: React.CSSProperties = {
  padding: "0.5rem 0.75rem",
  borderRadius: "0.375rem",
  border: "1px solid #ccc",
  fontSize: "0.9rem"
};

const buttonStyles: React.CSSProperties = {
  alignSelf: "flex-start",
  padding: "0.5rem 1.25rem",
  borderRadius: "0.375rem",
  border: "none",
  backgroundColor: "#111827",
  color: "#fff",
  fontSize: "0.95rem",
  cursor: "pointer"
};

const errorStyles: React.CSSProperties = {
  padding: "0.75rem 1rem",
  borderRadius: "0.375rem",
  backgroundColor: "#fef2f2",
  color: "#b91c1c",
  fontSize: "0.9rem",
  border: "1px solid #fecaca"
};

const navStyles: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.5rem",
  marginTop: "0.5rem",
  marginBottom: "0.5rem"
};

const navLinkStyles: React.CSSProperties = {
  fontSize: "0.85rem",
  color: "#111827",
  textDecoration: "none",
  padding: "0.25rem 0.5rem",
  borderRadius: "999px",
  border: "1px solid #e5e7eb",
  backgroundColor: "#f9fafb"
};

const resultSectionStyles: React.CSSProperties = {
  borderRadius: "0.5rem",
  border: "1px solid #e5e7eb",
  padding: "1rem",
  backgroundColor: "#ffffff"
};

const preStyles: React.CSSProperties = {
  marginTop: "0.5rem",
  padding: "0.75rem",
  borderRadius: "0.375rem",
  backgroundColor: "#0b1020",
  color: "#e5e7eb",
  fontSize: "0.8rem",
  overflowX: "auto",
  maxHeight: "480px"
};

