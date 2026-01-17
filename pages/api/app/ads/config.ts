import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";

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

type ErrorResponse = {
  error: string;
};

function getEnvironment(): "dev" | "staging" | "prod" {
  if (process.env.APP_ENV === "staging") {
    return "staging";
  }
  if (
    process.env.APP_ENV === "production" ||
    process.env.NODE_ENV === "production"
  ) {
    return "prod";
  }
  return "dev";
}

function getBooleanEnv(name: string, fallback: boolean): boolean {
  const value = process.env[name];
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return fallback;
}

function getNumberEnv(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AdsConfigResponse | ErrorResponse>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  let supabase;

  try {
    const context = await getAuthContext(req);
    supabase = context.supabase;
  } catch {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const environment = getEnvironment();

  const settingsResult = await supabase
    .from("app_ad_settings")
    .select("ads_enabled,max_ads_per_quiz_session,show_ad_after_every_question")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const settingsRow = settingsResult.data as
    | {
        ads_enabled: boolean | null;
        max_ads_per_quiz_session: number | null;
        show_ad_after_every_question: boolean | null;
      }
    | null;

  const adsEnabled =
    settingsRow && typeof settingsRow.ads_enabled === "boolean"
      ? settingsRow.ads_enabled
      : getBooleanEnv("ADS_ENABLED", true);

  const maxAdsPerQuizSession =
    settingsRow &&
    typeof settingsRow.max_ads_per_quiz_session === "number" &&
    Number.isFinite(settingsRow.max_ads_per_quiz_session) &&
    settingsRow.max_ads_per_quiz_session > 0
      ? settingsRow.max_ads_per_quiz_session
      : getNumberEnv("MAX_ADS_PER_QUIZ_SESSION", 10);

  const showAfterEveryQuestion =
    settingsRow &&
    typeof settingsRow.show_ad_after_every_question === "boolean"
      ? settingsRow.show_ad_after_every_question
      : getBooleanEnv("SHOW_AD_AFTER_EVERY_QUESTION", true);

  const providersResult = await supabase
    .from("ad_providers")
    .select(
      "provider,is_enabled,weight,platform,environment,ad_unit_interstitial,ad_unit_rewarded,ad_unit_banner"
    )
    .eq("environment", environment)
    .eq("is_enabled", true);

  let providers: AdConfigProvider[] = [];

  if (!providersResult.error && Array.isArray(providersResult.data)) {
    providers = providersResult.data
      .map((row: any) => {
        const providerName = row.provider as string;
        const platform = row.platform as string;
        const env = row.environment as string;

        if (
          providerName !== "ADMOB" &&
          providerName !== "META" &&
          providerName !== "UNITY" &&
          providerName !== "APPLOVIN"
        ) {
          return null;
        }

        if (platform !== "android" && platform !== "ios" && platform !== "both") {
          return null;
        }

        if (env !== "dev" && env !== "staging" && env !== "prod") {
          return null;
        }

        const weight =
          typeof row.weight === "number" && Number.isFinite(row.weight)
            ? row.weight
            : 100;

        const record: AdConfigProvider = {
          provider: providerName,
          is_enabled: !!row.is_enabled,
          weight,
          platform,
          environment: env,
          ad_unit_interstitial:
            typeof row.ad_unit_interstitial === "string"
              ? row.ad_unit_interstitial
              : null,
          ad_unit_rewarded:
            typeof row.ad_unit_rewarded === "string"
              ? row.ad_unit_rewarded
              : null,
          ad_unit_banner:
            typeof row.ad_unit_banner === "string" ? row.ad_unit_banner : null
        };

        return record;
      })
      .filter((row): row is AdConfigProvider => row !== null);
  }

  if (!providers.length) {
    providers = [
      {
        provider: "ADMOB",
        is_enabled: true,
        weight: 100,
        platform: "both",
        environment,
        ad_unit_interstitial: process.env.ADMOB_INTERSTITIAL_UNIT_ID ?? null,
        ad_unit_rewarded: process.env.ADMOB_REWARDED_UNIT_ID ?? null,
        ad_unit_banner: process.env.ADMOB_BANNER_UNIT_ID ?? null
      }
    ];
  }

  const response: AdsConfigResponse = {
    ads_enabled: adsEnabled,
    max_ads_per_quiz_session: maxAdsPerQuizSession,
    show_ad_after_every_question: showAfterEveryQuestion,
    providers
  };

  res.status(200).json(response);
}
