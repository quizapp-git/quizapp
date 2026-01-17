import Head from "next/head";
import { useMemo, useState } from "react";

type TimeRangeKey = "today" | "yesterday" | "last7" | "last30" | "custom";

type FetchState = "idle" | "loading" | "error" | "success";

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

type TabKey = "summary" | "revenue" | "content" | "whatIf";

export default function AdminAiInsightsPage() {
  const [rangeKey, setRangeKey] = useState<TimeRangeKey>("last30");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("summary");

  const [appId, setAppId] = useState("");
  const [quizId, setQuizId] = useState("");
  const [constraints, setConstraints] = useState("");

  const [newPkrPerCoin, setNewPkrPerCoin] = useState("");
  const [newWithdrawalThreshold, setNewWithdrawalThreshold] = useState("");
  const [newUserSharePercent, setNewUserSharePercent] = useState("");
  const [newPlatformSharePercent, setNewPlatformSharePercent] = useState("");
  const [newRewardCoinsPerQuiz, setNewRewardCoinsPerQuiz] = useState("");

  const [state, setState] = useState<FetchState>("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<string>("");

  const range = useMemo(() => {
    if (rangeKey === "custom" && customFrom && customTo) {
      return { from: customFrom, to: customTo };
    }
    return getPresetRange(rangeKey);
  }, [rangeKey, customFrom, customTo]);

  async function runInsights(event: React.FormEvent) {
    event.preventDefault();

    setState("loading");
    setError("");
    setResult("");

    const basePayload: any = {
      from: range.from,
      to: range.to
    };

    let path = "";
    let payload: any = basePayload;

    if (activeTab === "summary") {
      path = "/api/app/admin/ai/summary";
      payload = {
        ...basePayload,
        appId: appId || null,
        quizId: quizId || null
      };
    } else if (activeTab === "revenue") {
      path = "/api/app/admin/ai/revenue-suggestions";
      payload = {
        ...basePayload,
        constraints: constraints || null
      };
    } else if (activeTab === "content") {
      path = "/api/app/admin/ai/content-tuning";
      payload = {
        ...basePayload,
        quizId: quizId || null
      };
    } else if (activeTab === "whatIf") {
      path = "/api/app/admin/ai/what-if";
      payload = {
        ...basePayload,
        scenario: {
          newPkrPerCoin: newPkrPerCoin ? Number(newPkrPerCoin) : null,
          newWithdrawalThreshold: newWithdrawalThreshold
            ? Number(newWithdrawalThreshold)
            : null,
          newUserSharePercent: newUserSharePercent
            ? Number(newUserSharePercent)
            : null,
          newPlatformSharePercent: newPlatformSharePercent
            ? Number(newPlatformSharePercent)
            : null,
          newRewardCoinsPerQuiz: newRewardCoinsPerQuiz
            ? Number(newRewardCoinsPerQuiz)
            : null
        }
      };
    }

    try {
      const response = await fetch(path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
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

      if (activeTab === "summary" && typeof json.summary === "string") {
        setResult(json.summary);
      } else if (
        activeTab === "revenue" &&
        typeof json.recommendations === "string"
      ) {
        setResult(json.recommendations);
      } else if (
        activeTab === "content" &&
        typeof json.insights === "string"
      ) {
        setResult(json.insights);
      } else if (
        activeTab === "whatIf" &&
        typeof json.analysis === "string"
      ) {
        setResult(json.analysis);
      } else {
        setResult(JSON.stringify(json, null, 2));
      }

      setState("success");
    } catch (err: any) {
      setError(err?.message || "Request failed");
      setState("error");
    }
  }

  return (
    <>
      <Head>
        <title>AI insights and revenue copilot</title>
      </Head>
      <main style={mainStyles}>
        <header>
          <h1 style={titleStyles}>AI insights and revenue copilot</h1>
          <p style={textStyles}>
            Use AI on top of your analytics to summarize performance, suggest
            optimizations and simulate changes before you apply them.
          </p>
        </header>

        <nav style={tabNavStyles}>
          <button
            type="button"
            onClick={() => setActiveTab("summary")}
            style={
              activeTab === "summary" ? activeTabButtonStyles : tabButtonStyles
            }
          >
            Performance summary
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("revenue")}
            style={
              activeTab === "revenue" ? activeTabButtonStyles : tabButtonStyles
            }
          >
            Revenue suggestions
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("content")}
            style={
              activeTab === "content" ? activeTabButtonStyles : tabButtonStyles
            }
          >
            Content and difficulty tuning
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("whatIf")}
            style={
              activeTab === "whatIf" ? activeTabButtonStyles : tabButtonStyles
            }
          >
            What-if simulation
          </button>
        </nav>

        <form onSubmit={runInsights} style={formStyles}>
          <section style={cardStyles}>
            <h2 style={subtitleStyles}>Time range</h2>
            <div style={rowStyles}>
              <label style={labelStyles}>
                Range
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
                      onChange={(event) => setCustomFrom(event.target.value)}
                      style={inputStyles}
                    />
                  </label>
                  <label style={labelStyles}>
                    To
                    <input
                      type="date"
                      value={customTo}
                      onChange={(event) => setCustomTo(event.target.value)}
                      style={inputStyles}
                    />
                  </label>
                </>
              )}
            </div>
          </section>

          <section style={cardStyles}>
            <h2 style={subtitleStyles}>Context filters</h2>
            <div style={rowStyles}>
              <label style={labelStyles}>
                AdMob app
                <input
                  type="text"
                  value={appId}
                  onChange={(event) => setAppId(event.target.value)}
                  style={inputStyles}
                  placeholder="Optional app ID"
                />
              </label>
              <label style={labelStyles}>
                Quiz
                <input
                  type="text"
                  value={quizId}
                  onChange={(event) => setQuizId(event.target.value)}
                  style={inputStyles}
                  placeholder="Optional quiz ID"
                />
              </label>
            </div>
            {activeTab === "revenue" && (
              <div style={singleRowStyles}>
                <label style={labelStyles}>
                  Constraints
                  <textarea
                    value={constraints}
                    onChange={(event) => setConstraints(event.target.value)}
                    style={textareaStyles}
                    placeholder="Optional constraints, for example: keep user share above 40%, limit daily payouts to X PKR, avoid aggressive reward cuts."
                    rows={3}
                  />
                </label>
              </div>
            )}
            {activeTab === "whatIf" && (
              <div style={rowStyles}>
                <label style={labelStyles}>
                  New PKR per coin
                  <input
                    type="number"
                    value={newPkrPerCoin}
                    onChange={(event) => setNewPkrPerCoin(event.target.value)}
                    style={inputStyles}
                    placeholder="Leave blank to keep current"
                    min="0"
                    step="0.01"
                  />
                </label>
                <label style={labelStyles}>
                  New withdrawal threshold (PKR)
                  <input
                    type="number"
                    value={newWithdrawalThreshold}
                    onChange={(event) =>
                      setNewWithdrawalThreshold(event.target.value)
                    }
                    style={inputStyles}
                    placeholder="Leave blank to keep current"
                    min="0"
                    step="1"
                  />
                </label>
              </div>
            )}
            {activeTab === "whatIf" && (
              <div style={rowStyles}>
                <label style={labelStyles}>
                  New user share percent
                  <input
                    type="number"
                    value={newUserSharePercent}
                    onChange={(event) =>
                      setNewUserSharePercent(event.target.value)
                    }
                    style={inputStyles}
                    placeholder="Leave blank to keep current"
                    min="0"
                    max="100"
                    step="1"
                  />
                </label>
                <label style={labelStyles}>
                  New platform share percent
                  <input
                    type="number"
                    value={newPlatformSharePercent}
                    onChange={(event) =>
                      setNewPlatformSharePercent(event.target.value)
                    }
                    style={inputStyles}
                    placeholder="Leave blank to keep current"
                    min="0"
                    max="100"
                    step="1"
                  />
                </label>
                <label style={labelStyles}>
                  New reward coins per quiz
                  <input
                    type="number"
                    value={newRewardCoinsPerQuiz}
                    onChange={(event) =>
                      setNewRewardCoinsPerQuiz(event.target.value)
                    }
                    style={inputStyles}
                    placeholder="Leave blank to keep current"
                    min="0"
                    step="1"
                  />
                </label>
              </div>
            )}
          </section>

          <div style={actionsRowStyles}>
            <button
              type="submit"
              style={primaryButtonStyles}
              disabled={state === "loading"}
            >
              {state === "loading" ? "Generating insights..." : "Generate insights"}
            </button>
            <span style={hintTextStyles}>
              AI never sees raw PII, only aggregated analytics and settings.
            </span>
          </div>
        </form>

        {state === "error" && error && (
          <section style={cardStyles}>
            <h2 style={subtitleStyles}>Error</h2>
            <div style={errorStyles}>{error}</div>
          </section>
        )}

        {state !== "idle" && (
          <section style={cardStyles}>
            <h2 style={subtitleStyles}>AI output</h2>
            {state === "loading" && (
              <div style={textStyles}>Waiting for AI response...</div>
            )}
            {state !== "loading" && (
              <pre style={preStyles}>{result}</pre>
            )}
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
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
};

const formStyles: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "1rem"
};

const rowStyles: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "1rem"
};

const singleRowStyles: React.CSSProperties = {
  marginTop: "1rem"
};

const labelStyles: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.25rem",
  fontSize: "0.9rem",
  flex: 1,
  minWidth: "220px"
};

const inputStyles: React.CSSProperties = {
  padding: "0.5rem 0.75rem",
  borderRadius: "0.5rem",
  border: "1px solid #d1d5db",
  fontSize: "0.9rem"
};

const textareaStyles: React.CSSProperties = {
  ...inputStyles,
  resize: "vertical"
};

const actionsRowStyles: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "1rem"
};

const primaryButtonStyles: React.CSSProperties = {
  padding: "0.6rem 1.4rem",
  borderRadius: "999px",
  border: "none",
  background: "linear-gradient(to right, #4f46e5, #6366f1)",
  color: "#ffffff",
  fontWeight: 600,
  fontSize: "0.95rem",
  cursor: "pointer"
};

const hintTextStyles: React.CSSProperties = {
  fontSize: "0.85rem",
  color: "#6b7280"
};

const errorStyles: React.CSSProperties = {
  padding: "0.75rem 1rem",
  borderRadius: "0.5rem",
  backgroundColor: "#fef2f2",
  color: "#b91c1c",
  fontSize: "0.9rem",
  border: "1px solid #fecaca"
};

const preStyles: React.CSSProperties = {
  marginTop: "0.5rem",
  padding: "1rem",
  borderRadius: "0.5rem",
  backgroundColor: "#111827",
  color: "#e5e7eb",
  fontSize: "0.9rem",
  maxHeight: "420px",
  overflow: "auto",
  whiteSpace: "pre-wrap"
};

const tabNavStyles: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.5rem"
};

const tabButtonStyles: React.CSSProperties = {
  padding: "0.4rem 0.9rem",
  borderRadius: "999px",
  border: "1px solid #e5e7eb",
  backgroundColor: "#ffffff",
  fontSize: "0.85rem",
  cursor: "pointer",
  color: "#4b5563"
};

const activeTabButtonStyles: React.CSSProperties = {
  ...tabButtonStyles,
  backgroundColor: "#111827",
  color: "#f9fafb",
  borderColor: "#111827"
};

