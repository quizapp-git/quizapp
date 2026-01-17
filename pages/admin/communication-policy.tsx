import Head from "next/head";
import { useState } from "react";

type FetchState = "idle" | "loading" | "error" | "success";

type CommunicationPolicy = {
  text_preset_only_max_ads: number;
  text_custom_min_ads: number;
  voice_chat_min_ads: number;
};

type CommunicationStage = "PRESET_ONLY" | "CUSTOM_TEXT" | "VOICE_ENABLED";

type OverrideRow = {
  user_id: string;
  forced_stage: CommunicationStage;
  expires_at: string | null;
};

export default function AdminCommunicationPolicyPage() {
  const [token, setToken] = useState("");

  const [policyState, setPolicyState] = useState<FetchState>("idle");
  const [policyError, setPolicyError] = useState("");
  const [policySuccess, setPolicySuccess] = useState("");
  const [textPresetOnlyMaxAds, setTextPresetOnlyMaxAds] = useState("");
  const [textCustomMinAds, setTextCustomMinAds] = useState("");
  const [voiceChatMinAds, setVoiceChatMinAds] = useState("");

  const [overrideUserId, setOverrideUserId] = useState("");
  const [overrideStage, setOverrideStage] =
    useState<CommunicationStage>("PRESET_ONLY");
  const [overrideExpiresAt, setOverrideExpiresAt] = useState("");
  const [overrideState, setOverrideState] = useState<FetchState>("idle");
  const [overrideError, setOverrideError] = useState("");
  const [overrideSuccess, setOverrideSuccess] = useState("");
  const [loadedOverride, setLoadedOverride] = useState<OverrideRow | null>(
    null
  );

  async function loadPolicy(event: React.FormEvent) {
    event.preventDefault();
    setPolicyState("loading");
    setPolicyError("");
    setPolicySuccess("");
    try {
      const response = await fetch("/api/app/admin/communication/policy", {
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
        setPolicyError(message);
        setPolicyState("error");
        return;
      }
      const json = (await response.json()) as CommunicationPolicy;
      setTextPresetOnlyMaxAds(
        String(json.text_preset_only_max_ads ?? "").toString()
      );
      setTextCustomMinAds(String(json.text_custom_min_ads ?? "").toString());
      setVoiceChatMinAds(String(json.voice_chat_min_ads ?? "").toString());
      setPolicyState("success");
      setPolicySuccess("Loaded current communication policy.");
    } catch (error: any) {
      setPolicyError(error?.message || "Failed to load policy");
      setPolicyState("error");
    }
  }

  async function savePolicy(event: React.FormEvent) {
    event.preventDefault();
    setPolicyState("loading");
    setPolicyError("");
    setPolicySuccess("");
    try {
      const payload: Record<string, unknown> = {};
      if (textPresetOnlyMaxAds.trim().length > 0) {
        payload.text_preset_only_max_ads = Number(textPresetOnlyMaxAds);
      }
      if (textCustomMinAds.trim().length > 0) {
        payload.text_custom_min_ads = Number(textCustomMinAds);
      }
      if (voiceChatMinAds.trim().length > 0) {
        payload.voice_chat_min_ads = Number(voiceChatMinAds);
      }
      const response = await fetch("/api/app/admin/communication/policy", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token
            ? {
                Authorization: `Bearer ${token}`
              }
            : {})
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const message =
          body && typeof body.error === "string"
            ? body.error
            : `Request failed with status ${response.status}`;
        setPolicyError(message);
        setPolicyState("error");
        return;
      }
      const json = (await response.json()) as CommunicationPolicy;
      setTextPresetOnlyMaxAds(
        String(json.text_preset_only_max_ads ?? "").toString()
      );
      setTextCustomMinAds(String(json.text_custom_min_ads ?? "").toString());
      setVoiceChatMinAds(String(json.voice_chat_min_ads ?? "").toString());
      setPolicyState("success");
      setPolicySuccess("Updated communication policy.");
    } catch (error: any) {
      setPolicyError(error?.message || "Failed to update policy");
      setPolicyState("error");
    }
  }

  async function loadOverride(event: React.FormEvent) {
    event.preventDefault();
    setOverrideState("loading");
    setOverrideError("");
    setOverrideSuccess("");
    setLoadedOverride(null);
    if (!overrideUserId.trim()) {
      setOverrideError("User ID is required");
      setOverrideState("error");
      return;
    }
    try {
      const url = new URL(
        "/api/app/admin/communication/overrides",
        window.location.origin
      );
      url.searchParams.set("user_id", overrideUserId.trim());
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
        setOverrideError(message);
        setOverrideState("error");
        return;
      }
      const json = (await response.json()) as { override: OverrideRow | null };
      if (!json.override) {
        setLoadedOverride(null);
        setOverrideStage("PRESET_ONLY");
        setOverrideExpiresAt("");
        setOverrideSuccess("No override is currently set for this user.");
        setOverrideState("success");
        return;
      }
      setLoadedOverride(json.override);
      setOverrideStage(json.override.forced_stage);
      setOverrideExpiresAt(
        json.override.expires_at
          ? json.override.expires_at.slice(0, 16)
          : ""
      );
      setOverrideSuccess("Loaded current override.");
      setOverrideState("success");
    } catch (error: any) {
      setOverrideError(error?.message || "Failed to load override");
      setOverrideState("error");
    }
  }

  async function saveOverride(event: React.FormEvent) {
    event.preventDefault();
    setOverrideState("loading");
    setOverrideError("");
    setOverrideSuccess("");
    setLoadedOverride(null);
    if (!overrideUserId.trim()) {
      setOverrideError("User ID is required");
      setOverrideState("error");
      return;
    }
    try {
      const expiresAtIso =
        overrideExpiresAt && overrideExpiresAt.length > 0
          ? new Date(overrideExpiresAt).toISOString()
          : null;
      const payload = {
        user_id: overrideUserId.trim(),
        forced_stage: overrideStage,
        expires_at: expiresAtIso
      };
      const response = await fetch("/api/app/admin/communication/overrides", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token
            ? {
                Authorization: `Bearer ${token}`
              }
            : {})
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const message =
          body && typeof body.error === "string"
            ? body.error
            : `Request failed with status ${response.status}`;
        setOverrideError(message);
        setOverrideState("error");
        return;
      }
      const json = (await response.json()) as { override: OverrideRow };
      setLoadedOverride(json.override);
      setOverrideStage(json.override.forced_stage);
      setOverrideExpiresAt(
        json.override.expires_at
          ? json.override.expires_at.slice(0, 16)
          : ""
      );
      setOverrideSuccess("Saved override.");
      setOverrideState("success");
    } catch (error: any) {
      setOverrideError(error?.message || "Failed to save override");
      setOverrideState("error");
    }
  }

  async function deleteOverride(event: React.FormEvent) {
    event.preventDefault();
    setOverrideState("loading");
    setOverrideError("");
    setOverrideSuccess("");
    setLoadedOverride(null);
    if (!overrideUserId.trim()) {
      setOverrideError("User ID is required");
      setOverrideState("error");
      return;
    }
    try {
      const response = await fetch("/api/app/admin/communication/overrides", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token
            ? {
                Authorization: `Bearer ${token}`
              }
            : {})
        },
        body: JSON.stringify({ user_id: overrideUserId.trim() })
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const message =
          body && typeof body.error === "string"
            ? body.error
            : `Request failed with status ${response.status}`;
        setOverrideError(message);
        setOverrideState("error");
        return;
      }
      setOverrideSuccess("Deleted override.");
      setOverrideStage("PRESET_ONLY");
      setOverrideExpiresAt("");
      setLoadedOverride(null);
      setOverrideState("success");
    } catch (error: any) {
      setOverrideError(error?.message || "Failed to delete override");
      setOverrideState("error");
    }
  }

  return (
    <>
      <Head>
        <title>Communication policy</title>
      </Head>
      <main style={mainStyles}>
        <h1 style={titleStyles}>Communication policy</h1>
        <p style={textStyles}>
          Configure global thresholds for chat and voice access, and manage
          per-user overrides.
        </p>

        <nav style={navStyles}>
          <a href="/admin/dashboard/analytics" style={navLinkStyles}>
            Analytics overview
          </a>
          <a href="/admin/reporting" style={navLinkStyles}>
            Reporting dashboard
          </a>
          <a href="/admin/ai-insights" style={navLinkStyles}>
            AI insights
          </a>
        </nav>

        <section style={cardStyles}>
          <h2 style={subtitleStyles}>Supabase admin access token</h2>
          <p style={smallTextStyles}>
            Use a Supabase access token for an admin user to authenticate
            requests to admin APIs.
          </p>
          <label style={labelStyles}>
            Access token
            <input
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              style={inputStyles}
              placeholder="Bearer token for admin user"
            />
          </label>
        </section>

        <section style={cardStyles}>
          <h2 style={subtitleStyles}>Global communication thresholds</h2>
          <p style={smallTextStyles}>
            These thresholds control when players unlock custom text chat and
            voice chat based on ad impressions.
          </p>
          <form onSubmit={loadPolicy} style={formStyles}>
            <button
              type="submit"
              style={buttonStyles}
              disabled={policyState === "loading"}
            >
              {policyState === "loading" ? "Loading..." : "Load current policy"}
            </button>
          </form>

          <form onSubmit={savePolicy} style={formStyles}>
            <label style={labelStyles}>
              Max ads for preset-only text
              <input
                type="number"
                min={0}
                value={textPresetOnlyMaxAds}
                onChange={(event) =>
                  setTextPresetOnlyMaxAds(event.target.value)
                }
                style={inputStyles}
                placeholder="Default 99"
              />
            </label>
            <label style={labelStyles}>
              Min ads for custom text chat
              <input
                type="number"
                min={0}
                value={textCustomMinAds}
                onChange={(event) => setTextCustomMinAds(event.target.value)}
                style={inputStyles}
                placeholder="Default 100"
              />
            </label>
            <label style={labelStyles}>
              Min ads for voice chat
              <input
                type="number"
                min={0}
                value={voiceChatMinAds}
                onChange={(event) => setVoiceChatMinAds(event.target.value)}
                style={inputStyles}
                placeholder="Default 500"
              />
            </label>
            <button
              type="submit"
              style={buttonStyles}
              disabled={policyState === "loading"}
            >
              {policyState === "loading" ? "Saving..." : "Save policy"}
            </button>
          </form>

          {policyError && <div style={errorStyles}>{policyError}</div>}
          {policySuccess && <div style={successStyles}>{policySuccess}</div>}
        </section>

        <section style={cardStyles}>
          <h2 style={subtitleStyles}>Per-user overrides</h2>
          <p style={smallTextStyles}>
            Temporarily override a player&apos;s communication stage for support
            or experiments.
          </p>
          <form onSubmit={loadOverride} style={formStyles}>
            <label style={labelStyles}>
              User ID
              <input
                type="text"
                value={overrideUserId}
                onChange={(event) => setOverrideUserId(event.target.value)}
                style={inputStyles}
                placeholder="Supabase user ID"
              />
            </label>
            <button
              type="submit"
              style={buttonStyles}
              disabled={overrideState === "loading"}
            >
              {overrideState === "loading" ? "Loading..." : "Load override"}
            </button>
          </form>

          <form onSubmit={saveOverride} style={formStyles}>
            <div style={rowStyles}>
              <label style={labelStyles}>
                Forced communication stage
                <select
                  value={overrideStage}
                  onChange={(event) =>
                    setOverrideStage(
                      event.target.value as CommunicationStage
                    )
                  }
                  style={inputStyles}
                >
                  <option value="PRESET_ONLY">Preset-only quick chat</option>
                  <option value="CUSTOM_TEXT">Custom text chat</option>
                  <option value="VOICE_ENABLED">Voice chat enabled</option>
                </select>
              </label>
              <label style={labelStyles}>
                Expires at (optional)
                <input
                  type="datetime-local"
                  value={overrideExpiresAt}
                  onChange={(event) =>
                    setOverrideExpiresAt(event.target.value)
                  }
                  style={inputStyles}
                />
              </label>
            </div>
            <div style={rowStyles}>
              <button
                type="submit"
                style={buttonStyles}
                disabled={overrideState === "loading"}
              >
                {overrideState === "loading" ? "Saving..." : "Save override"}
              </button>
              <button
                type="button"
                style={secondaryButtonStyles}
                disabled={overrideState === "loading"}
                onClick={(event) => {
                  deleteOverride(event as any);
                }}
              >
                Delete override
              </button>
            </div>
          </form>

          {loadedOverride && (
            <div style={overrideSummaryStyles}>
              <div style={smallTextStyles}>
                Current override for user {loadedOverride.user_id}:{" "}
                {loadedOverride.forced_stage}
                {loadedOverride.expires_at
                  ? `, expires at ${loadedOverride.expires_at}`
                  : ", no expiry"}
              </div>
            </div>
          )}

          {overrideError && <div style={errorStyles}>{overrideError}</div>}
          {overrideSuccess && (
            <div style={successStyles}>{overrideSuccess}</div>
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

const smallTextStyles: React.CSSProperties = {
  fontSize: "0.85rem",
  color: "#4b5563"
};

const cardStyles: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.75rem",
  padding: "1.5rem",
  borderRadius: "0.5rem",
  border: "1px solid #e5e7eb",
  backgroundColor: "#fafafa"
};

const formStyles: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.75rem",
  marginTop: "0.75rem"
};

const rowStyles: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.75rem"
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

const secondaryButtonStyles: React.CSSProperties = {
  ...buttonStyles,
  backgroundColor: "#ef4444"
};

const errorStyles: React.CSSProperties = {
  marginTop: "0.75rem",
  padding: "0.75rem 1rem",
  borderRadius: "0.375rem",
  backgroundColor: "#fef2f2",
  color: "#b91c1c",
  fontSize: "0.9rem",
  border: "1px solid #fecaca"
};

const successStyles: React.CSSProperties = {
  marginTop: "0.75rem",
  padding: "0.75rem 1rem",
  borderRadius: "0.375rem",
  backgroundColor: "#ecfdf5",
  color: "#166534",
  fontSize: "0.9rem",
  border: "1px solid #bbf7d0"
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

const overrideSummaryStyles: React.CSSProperties = {
  marginTop: "0.75rem",
  padding: "0.75rem 1rem",
  borderRadius: "0.375rem",
  border: "1px solid #e5e7eb",
  backgroundColor: "#ffffff"
};

