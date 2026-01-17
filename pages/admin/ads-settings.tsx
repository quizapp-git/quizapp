import Head from "next/head";
import { useEffect, useState } from "react";

type AdProviderName = "ADMOB" | "META" | "UNITY" | "APPLOVIN";

type AdConfigProvider = {
  provider: AdProviderName;
  is_enabled: boolean;
  weight: number;
  platform: "android" | "ios" | "both";
  environment: "dev" | "staging" | "prod";
  ad_unit_interstitial: string | null;
  ad_unit_rewarded: string | null;
  ad_unit_banner: string | null;
};

type AdsConfigResponse = {
  ads_enabled: boolean;
  max_ads_per_quiz_session: number;
  show_ad_after_every_question: boolean;
  providers: AdConfigProvider[];
};

type FetchState = "idle" | "loading" | "error" | "success";

type AdminSettings = {
  ads_enabled: boolean;
  max_ads_per_quiz_session: number;
  show_ad_after_every_question: boolean;
};

type AdminSettingsState = {
  data: AdminSettings | null;
  state: FetchState;
  error: string;
  success: string;
};

type AdminProvidersState = {
  data: AdConfigProvider[];
  state: FetchState;
  error: string;
  success: string;
};

export default function AdminAdsSettingsPage() {
  const [token, setToken] = useState("");
  const [state, setState] = useState<FetchState>("idle");
  const [error, setError] = useState("");
  const [config, setConfig] = useState<AdsConfigResponse | null>(null);
  const [settings, setSettings] = useState<AdminSettingsState>({
    data: null,
    state: "idle",
    error: "",
    success: ""
  });
  const [providersAdmin, setProvidersAdmin] = useState<AdminProvidersState>({
    data: [],
    state: "idle",
    error: "",
    success: ""
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setState("loading");
      setError("");
      try {
        const response = await fetch("/api/app/ads/config", {
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
          if (!cancelled) {
            setError(message);
            setState("error");
          }
          return;
        }
        const json = (await response.json()) as AdsConfigResponse;
        if (!cancelled) {
          setConfig(json);
          setState("success");
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "Failed to load ads config");
          setState("error");
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <>
      <Head>
        <title>Ads settings</title>
      </Head>
      <main style={mainStyles}>
        <h1 style={titleStyles}>Ads settings</h1>
        <p style={textStyles}>
          Inspect current ads configuration used by the player app.
        </p>
        <section style={cardStyles}>
          <h2 style={subtitleStyles}>Viewer token</h2>
          <p style={smallTextStyles}>
            Use a player access token to load the configuration returned by the
            ads config API.
          </p>
          <label style={labelStyles}>
            Access token
            <input
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              style={inputStyles}
              placeholder="Bearer token for player"
            />
          </label>
        </section>
        <section style={cardStyles}>
          <h2 style={subtitleStyles}>Current configuration</h2>
          {state === "loading" && (
            <div style={textStyles}>Loading ads configuration...</div>
          )}
          {state === "error" && error && (
            <div style={errorStyles}>{error}</div>
          )}
          {state === "success" && config && (
            <>
              <div style={rowStyles}>
                <div style={metricStyles}>
                  <div style={metricLabelStyles}>Ads enabled</div>
                  <div style={metricValueStyles}>
                    {config.ads_enabled ? "Yes" : "No"}
                  </div>
                </div>
                <div style={metricStyles}>
                  <div style={metricLabelStyles}>Max ads per quiz</div>
                  <div style={metricValueStyles}>
                    {config.max_ads_per_quiz_session}
                  </div>
                </div>
                <div style={metricStyles}>
                  <div style={metricLabelStyles}>After every question</div>
                  <div style={metricValueStyles}>
                    {config.show_ad_after_every_question ? "Yes" : "No"}
                  </div>
                </div>
              </div>
              <div style={providersGridStyles}>
                {config.providers.map((provider) => (
                  <div key={provider.provider} style={providerCardStyles}>
                    <div style={providerHeaderStyles}>
                      <span style={providerNameStyles}>
                        {provider.provider}
                      </span>
                      <span style={providerBadgeStyles}>
                        {provider.is_enabled ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <div style={providerRowStyles}>
                      <span style={providerLabelStyles}>Platform</span>
                      <span style={providerValueStyles}>
                        {provider.platform}
                      </span>
                    </div>
                    <div style={providerRowStyles}>
                      <span style={providerLabelStyles}>Environment</span>
                      <span style={providerValueStyles}>
                        {provider.environment}
                      </span>
                    </div>
                    <div style={providerRowStyles}>
                      <span style={providerLabelStyles}>Weight</span>
                      <span style={providerValueStyles}>
                        {provider.weight}
                      </span>
                    </div>
                    <div style={providerRowStyles}>
                      <span style={providerLabelStyles}>Interstitial unit</span>
                      <span style={providerValueStyles}>
                        {provider.ad_unit_interstitial || "Not set"}
                      </span>
                    </div>
                    <div style={providerRowStyles}>
                      <span style={providerLabelStyles}>Rewarded unit</span>
                      <span style={providerValueStyles}>
                        {provider.ad_unit_rewarded || "Not set"}
                      </span>
                    </div>
                    <div style={providerRowStyles}>
                      <span style={providerLabelStyles}>Banner unit</span>
                      <span style={providerValueStyles}>
                        {provider.ad_unit_banner || "Not set"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
        <section style={cardStyles}>
          <h2 style={subtitleStyles}>Global ads settings</h2>
          <p style={smallTextStyles}>
            Configure global ads limits and behavior for all quiz sessions.
          </p>
          <div style={rowStyles}>
            <button
              type="button"
              style={buttonStyles}
              onClick={async () => {
                setSettings((previous) => ({
                  ...previous,
                  state: "loading",
                  error: "",
                  success: ""
                }));
                try {
                  const response = await fetch(
                    "/api/app/admin/ads/settings",
                    {
                      headers: token
                        ? {
                            Authorization: `Bearer ${token}`
                          }
                        : undefined
                    }
                  );
                  if (!response.ok) {
                    const body = await response.json().catch(() => null);
                    const message =
                      body && typeof body.error === "string"
                        ? body.error
                        : `Request failed with status ${response.status}`;
                    setSettings({
                      data: null,
                      state: "error",
                      error: message,
                      success: ""
                    });
                    return;
                  }
                  const json = (await response.json()) as AdminSettings;
                  setSettings({
                    data: json,
                    state: "success",
                    error: "",
                    success: "Loaded current ads settings."
                  });
                } catch (e: any) {
                  setSettings({
                    data: null,
                    state: "error",
                    error: e?.message || "Failed to load ads settings",
                    success: ""
                  });
                }
              }}
            >
              {settings.state === "loading" ? "Loading..." : "Load settings"}
            </button>
          </div>
          {settings.data && (
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                setSettings((previous) => ({
                  ...previous,
                  state: "loading",
                  error: "",
                  success: ""
                }));
                try {
                  const formData = new FormData(event.currentTarget);
                  const adsEnabledValue = formData.get("ads_enabled");
                  const maxAdsValue = formData.get("max_ads_per_quiz_session");
                  const showAfterEveryQuestionValue = formData.get(
                    "show_ad_after_every_question"
                  );
                  const payload: Record<string, unknown> = {};
                  if (adsEnabledValue !== null) {
                    payload.ads_enabled = adsEnabledValue === "on";
                  }
                  if (typeof maxAdsValue === "string") {
                    payload.max_ads_per_quiz_session = Number(maxAdsValue);
                  }
                  if (showAfterEveryQuestionValue !== null) {
                    payload.show_ad_after_every_question =
                      showAfterEveryQuestionValue === "on";
                  }
                  const response = await fetch(
                    "/api/app/admin/ads/settings",
                    {
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
                    }
                  );
                  if (!response.ok) {
                    const body = await response.json().catch(() => null);
                    const message =
                      body && typeof body.error === "string"
                        ? body.error
                        : `Request failed with status ${response.status}`;
                    setSettings((previous) => ({
                      ...previous,
                      state: "error",
                      error: message,
                      success: ""
                    }));
                    return;
                  }
                  const json = (await response.json()) as AdminSettings;
                  setSettings({
                    data: json,
                    state: "success",
                    error: "",
                    success: "Saved ads settings."
                  });
                } catch (e: any) {
                  setSettings((previous) => ({
                    ...previous,
                    state: "error",
                    error: e?.message || "Failed to save ads settings",
                    success: ""
                  }));
                }
              }}
              style={formStyles}
            >
              <label style={checkboxLabelStyles}>
                <input
                  type="checkbox"
                  name="ads_enabled"
                  defaultChecked={settings.data.ads_enabled}
                />
                <span>Ads enabled</span>
              </label>
              <label style={labelStyles}>
                Max ads per quiz session
                <input
                  type="number"
                  name="max_ads_per_quiz_session"
                  min={1}
                  defaultValue={settings.data.max_ads_per_quiz_session}
                  style={inputStyles}
                />
              </label>
              <label style={checkboxLabelStyles}>
                <input
                  type="checkbox"
                  name="show_ad_after_every_question"
                  defaultChecked={settings.data.show_ad_after_every_question}
                />
                <span>Show ad after every question</span>
              </label>
              <button
                type="submit"
                style={buttonStyles}
                disabled={settings.state === "loading"}
              >
                {settings.state === "loading" ? "Saving..." : "Save settings"}
              </button>
            </form>
          )}
          {settings.error && (
            <div style={errorStyles}>{settings.error}</div>
          )}
          {settings.success && (
            <div style={successStyles}>{settings.success}</div>
          )}
        </section>
        <section style={cardStyles}>
          <h2 style={subtitleStyles}>Ad providers</h2>
          <p style={smallTextStyles}>
            Manage ad providers, weights and ad unit IDs used by the ads
            module.
          </p>
          <div style={rowStyles}>
            <button
              type="button"
              style={buttonStyles}
              onClick={async () => {
                setProvidersAdmin((previous) => ({
                  ...previous,
                  state: "loading",
                  error: "",
                  success: ""
                }));
                try {
                  const response = await fetch(
                    "/api/app/admin/ads/providers",
                    {
                      headers: token
                        ? {
                            Authorization: `Bearer ${token}`
                          }
                        : undefined
                    }
                  );
                  if (!response.ok) {
                    const body = await response.json().catch(() => null);
                    const message =
                      body && typeof body.error === "string"
                        ? body.error
                        : `Request failed with status ${response.status}`;
                    setProvidersAdmin({
                      data: [],
                      state: "error",
                      error: message,
                      success: ""
                    });
                    return;
                  }
                  const json = (await response.json()) as {
                    providers: AdConfigProvider[];
                  };
                  setProvidersAdmin({
                    data: json.providers,
                    state: "success",
                    error: "",
                    success: "Loaded ad providers."
                  });
                } catch (e: any) {
                  setProvidersAdmin({
                    data: [],
                    state: "error",
                    error: e?.message || "Failed to load ad providers",
                    success: ""
                  });
                }
              }}
            >
              {providersAdmin.state === "loading"
                ? "Loading..."
                : "Load providers"}
            </button>
          </div>
          {providersAdmin.error && (
            <div style={errorStyles}>{providersAdmin.error}</div>
          )}
          {providersAdmin.success && (
            <div style={successStyles}>{providersAdmin.success}</div>
          )}
          {providersAdmin.data.length > 0 && (
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                setProvidersAdmin((previous) => ({
                  ...previous,
                  state: "loading",
                  error: "",
                  success: ""
                }));
                try {
                  const formData = new FormData(event.currentTarget);
                  const providersPayload: any[] = [];
                  providersAdmin.data.forEach((provider, index) => {
                    const prefix = `provider_${index}_`;
                    const id = formData.get(prefix + "id");
                    const providerValue = formData.get(prefix + "provider");
                    const platformValue = formData.get(prefix + "platform");
                    const environmentValue = formData.get(
                      prefix + "environment"
                    );
                    const isEnabledValue = formData.get(
                      prefix + "is_enabled"
                    );
                    const weightValue = formData.get(prefix + "weight");
                    const interstitialValue = formData.get(
                      prefix + "ad_unit_interstitial"
                    );
                    const rewardedValue = formData.get(
                      prefix + "ad_unit_rewarded"
                    );
                    const bannerValue = formData.get(
                      prefix + "ad_unit_banner"
                    );
                    const row: any = {
                      provider: providerValue,
                      platform: platformValue,
                      environment: environmentValue,
                      is_enabled: isEnabledValue === "on",
                      weight:
                        typeof weightValue === "string"
                          ? Number(weightValue)
                          : provider.weight,
                      ad_unit_interstitial:
                        typeof interstitialValue === "string"
                          ? interstitialValue
                          : provider.ad_unit_interstitial,
                      ad_unit_rewarded:
                        typeof rewardedValue === "string"
                          ? rewardedValue
                          : provider.ad_unit_rewarded,
                      ad_unit_banner:
                        typeof bannerValue === "string"
                          ? bannerValue
                          : provider.ad_unit_banner
                    };
                    if (typeof id === "string" && id.length > 0) {
                      row.id = id;
                    }
                    providersPayload.push(row);
                  });
                  const response = await fetch(
                    "/api/app/admin/ads/providers",
                    {
                      method: "PUT",
                      headers: {
                        "Content-Type": "application/json",
                        ...(token
                          ? {
                              Authorization: `Bearer ${token}`
                            }
                          : {})
                      },
                      body: JSON.stringify({
                        providers: providersPayload
                      })
                    }
                  );
                  if (!response.ok) {
                    const body = await response.json().catch(() => null);
                    const message =
                      body && typeof body.error === "string"
                        ? body.error
                        : `Request failed with status ${response.status}`;
                    setProvidersAdmin((previous) => ({
                      ...previous,
                      state: "error",
                      error: message,
                      success: ""
                    }));
                    return;
                  }
                  const json = (await response.json()) as {
                    providers: AdConfigProvider[];
                  };
                  setProvidersAdmin({
                    data: json.providers,
                    state: "success",
                    error: "",
                    success: "Saved ad providers."
                  });
                } catch (e: any) {
                  setProvidersAdmin((previous) => ({
                    ...previous,
                    state: "error",
                    error: e?.message || "Failed to save ad providers",
                    success: ""
                  }));
                }
              }}
              style={providersFormStyles}
            >
              <div style={providersGridStyles}>
                {providersAdmin.data.map((provider, index) => {
                  const prefix = `provider_${index}_`;
                  return (
                    <div key={prefix} style={providerCardStyles}>
                      <input
                        type="hidden"
                        name={prefix + "id"}
                        defaultValue={(provider as any).id || ""}
                      />
                      <div style={providerHeaderStyles}>
                        <span style={providerNameStyles}>
                          Provider {index + 1}
                        </span>
                      </div>
                      <label style={labelStyles}>
                        Name
                        <select
                          name={prefix + "provider"}
                          defaultValue={provider.provider}
                          style={inputStyles}
                        >
                          <option value="ADMOB">AdMob</option>
                          <option value="META">Meta</option>
                          <option value="UNITY">Unity</option>
                          <option value="APPLOVIN">AppLovin</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </label>
                      <label style={labelStyles}>
                        Platform
                        <select
                          name={prefix + "platform"}
                          defaultValue={provider.platform}
                          style={inputStyles}
                        >
                          <option value="android">Android</option>
                          <option value="ios">iOS</option>
                          <option value="both">Both</option>
                        </select>
                      </label>
                      <label style={labelStyles}>
                        Environment
                        <select
                          name={prefix + "environment"}
                          defaultValue={provider.environment}
                          style={inputStyles}
                        >
                          <option value="dev">Dev</option>
                          <option value="staging">Staging</option>
                          <option value="prod">Prod</option>
                        </select>
                      </label>
                      <label style={checkboxLabelStyles}>
                        <input
                          type="checkbox"
                          name={prefix + "is_enabled"}
                          defaultChecked={provider.is_enabled}
                        />
                        <span>Enabled</span>
                      </label>
                      <label style={labelStyles}>
                        Weight
                        <input
                          type="number"
                          name={prefix + "weight"}
                          min={1}
                          defaultValue={provider.weight}
                          style={inputStyles}
                        />
                      </label>
                      <label style={labelStyles}>
                        Interstitial unit ID
                        <input
                          type="text"
                          name={prefix + "ad_unit_interstitial"}
                          defaultValue={provider.ad_unit_interstitial || ""}
                          style={inputStyles}
                        />
                      </label>
                      <label style={labelStyles}>
                        Rewarded unit ID
                        <input
                          type="text"
                          name={prefix + "ad_unit_rewarded"}
                          defaultValue={provider.ad_unit_rewarded || ""}
                          style={inputStyles}
                        />
                      </label>
                      <label style={labelStyles}>
                        Banner unit ID
                        <input
                          type="text"
                          name={prefix + "ad_unit_banner"}
                          defaultValue={provider.ad_unit_banner || ""}
                          style={inputStyles}
                        />
                      </label>
                    </div>
                  );
                })}
              </div>
              <button
                type="submit"
                style={buttonStyles}
                disabled={providersAdmin.state === "loading"}
              >
                {providersAdmin.state === "loading"
                  ? "Saving..."
                  : "Save providers"}
              </button>
            </form>
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

const smallTextStyles: React.CSSProperties = {
  fontSize: "0.85rem",
  color: "#6b7280"
};

const cardStyles: React.CSSProperties = {
  borderRadius: "0.75rem",
  border: "1px solid #e5e7eb",
  backgroundColor: "#ffffff",
  padding: "1.5rem",
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  display: "flex",
  flexDirection: "column",
  gap: "0.75rem"
};

const labelStyles: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.25rem",
  fontSize: "0.875rem",
  color: "#374151"
};

const inputStyles: React.CSSProperties = {
  padding: "0.5rem 0.75rem",
  borderRadius: "0.5rem",
  border: "1px solid #d1d5db",
  fontSize: "0.9rem"
};

const errorStyles: React.CSSProperties = {
  padding: "0.75rem 1rem",
  borderRadius: "0.5rem",
  backgroundColor: "#fef2f2",
  color: "#b91c1c",
  fontSize: "0.9rem"
};

const successStyles: React.CSSProperties = {
  padding: "0.75rem 1rem",
  borderRadius: "0.5rem",
  backgroundColor: "#ecfdf3",
  color: "#166534",
  fontSize: "0.9rem"
};

const rowStyles: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "1rem",
  marginTop: "0.75rem"
};

const formStyles: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.75rem",
  marginTop: "0.75rem"
};

const buttonStyles: React.CSSProperties = {
  padding: "0.5rem 1rem",
  borderRadius: "0.5rem",
  border: "none",
  backgroundColor: "#4f46e5",
  color: "#ffffff",
  fontSize: "0.9rem",
  cursor: "pointer"
};

const metricStyles: React.CSSProperties = {
  padding: "0.75rem 1rem",
  borderRadius: "0.5rem",
  border: "1px solid #e5e7eb",
  backgroundColor: "#f9fafb",
  minWidth: "160px"
};

const metricLabelStyles: React.CSSProperties = {
  fontSize: "0.8rem",
  color: "#6b7280",
  marginBottom: "0.25rem"
};

const metricValueStyles: React.CSSProperties = {
  fontSize: "1rem",
  fontWeight: 500
};

const providersGridStyles: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
  gap: "1rem",
  marginTop: "1rem"
};

const providersFormStyles: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
  marginTop: "1rem"
};

const providerCardStyles: React.CSSProperties = {
  borderRadius: "0.75rem",
  border: "1px solid #e5e7eb",
  padding: "1rem",
  backgroundColor: "#f9fafb",
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem"
};

const providerHeaderStyles: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "0.25rem"
};

const providerNameStyles: React.CSSProperties = {
  fontSize: "1rem",
  fontWeight: 600
};

const providerBadgeStyles: React.CSSProperties = {
  fontSize: "0.75rem",
  padding: "0.15rem 0.5rem",
  borderRadius: "999px",
  backgroundColor: "#e5e7eb",
  color: "#374151"
};

const providerRowStyles: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: "0.85rem"
};

const providerLabelStyles: React.CSSProperties = {
  color: "#6b7280"
};

const providerValueStyles: React.CSSProperties = {
  color: "#111827",
  marginLeft: "0.5rem",
  textAlign: "right" as const,
  maxWidth: "60%",
  wordBreak: "break-all" as const
};

const checkboxLabelStyles: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  fontSize: "0.85rem",
  color: "#374151"
};
