import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";

type AdProviderName = "ADMOB" | "META" | "UNITY" | "APPLOVIN" | "OTHER";

type AdProviderRow = {
  id: string;
  provider: AdProviderName;
  is_enabled: boolean;
  weight: number;
  platform: "android" | "ios" | "both";
  environment: "dev" | "staging" | "prod";
  ad_unit_interstitial: string | null;
  ad_unit_rewarded: string | null;
  ad_unit_banner: string | null;
};

type ListResponse = {
  providers: AdProviderRow[];
};

type ProviderInput = {
  id?: string;
  provider: AdProviderName;
  is_enabled: boolean;
  weight: number;
  platform: "android" | "ios" | "both";
  environment: "dev" | "staging" | "prod";
  ad_unit_interstitial?: string | null;
  ad_unit_rewarded?: string | null;
  ad_unit_banner?: string | null;
};

type UpdateBody = {
  providers: ProviderInput[];
};

type UpdateResponse = ListResponse;

type ErrorResponse = {
  error: string;
};

async function requireAdmin(req: NextApiRequest) {
  const { supabase, user } = await getAuthContext(req);

  const { data: adminProfile, error: adminError } = await supabase
    .from("admin_profiles")
    .select("id,is_super_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (adminError || !adminProfile) {
    const error: any = new Error("Forbidden");
    error.statusCode = 403;
    throw error;
  }

  return { supabase, user };
}

function normalizeProviderInput(input: ProviderInput): ProviderInput | null {
  if (
    input.provider !== "ADMOB" &&
    input.provider !== "META" &&
    input.provider !== "UNITY" &&
    input.provider !== "APPLOVIN" &&
    input.provider !== "OTHER"
  ) {
    return null;
  }

  if (
    input.platform !== "android" &&
    input.platform !== "ios" &&
    input.platform !== "both"
  ) {
    return null;
  }

  if (
    input.environment !== "dev" &&
    input.environment !== "staging" &&
    input.environment !== "prod"
  ) {
    return null;
  }

  const weight =
    typeof input.weight === "number" && Number.isFinite(input.weight)
      ? Math.max(1, Math.floor(input.weight))
      : 100;

  return {
    ...input,
    weight,
    ad_unit_interstitial:
      typeof input.ad_unit_interstitial === "string"
        ? input.ad_unit_interstitial
        : null,
    ad_unit_rewarded:
      typeof input.ad_unit_rewarded === "string"
        ? input.ad_unit_rewarded
        : null,
    ad_unit_banner:
      typeof input.ad_unit_banner === "string" ? input.ad_unit_banner : null
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ListResponse | UpdateResponse | ErrorResponse>
) {
  if (req.method !== "GET" && req.method !== "PUT") {
    res.setHeader("Allow", "GET,PUT");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  let supabase;

  try {
    const context = await requireAdmin(req);
    supabase = context.supabase;
  } catch (error: any) {
    if (error && typeof error.statusCode === "number") {
      res.status(error.statusCode).json({ error: error.message || "Forbidden" });
      return;
    }
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (req.method === "GET") {
    const result = await supabase
      .from("ad_providers")
      .select(
        "id,provider,is_enabled,weight,platform,environment,ad_unit_interstitial,ad_unit_rewarded,ad_unit_banner"
      )
      .order("provider", { ascending: true })
      .order("environment", { ascending: true })
      .order("platform", { ascending: true });

    if (result.error) {
      res.status(500).json({ error: "Failed to load ad providers" });
      return;
    }

    const providers: AdProviderRow[] = (result.data as any[]).map((row) => ({
      id: String(row.id),
      provider: row.provider as AdProviderName,
      is_enabled: !!row.is_enabled,
      weight: Number(row.weight ?? 100),
      platform: row.platform as "android" | "ios" | "both",
      environment: row.environment as "dev" | "staging" | "prod",
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
    }));

    res.status(200).json({ providers });
    return;
  }

  const body = req.body as UpdateBody | undefined;

  if (!body || !Array.isArray(body.providers)) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const normalized: ProviderInput[] = [];

  for (const provider of body.providers) {
    const value = normalizeProviderInput(provider);
    if (value) {
      normalized.push(value);
    }
  }

  if (!normalized.length) {
    res.status(400).json({ error: "No valid providers to update" });
    return;
  }

  const rows = normalized.map((provider) => ({
    id: provider.id,
    provider: provider.provider,
    is_enabled: provider.is_enabled,
    weight: provider.weight,
    platform: provider.platform,
    environment: provider.environment,
    ad_unit_interstitial: provider.ad_unit_interstitial,
    ad_unit_rewarded: provider.ad_unit_rewarded,
    ad_unit_banner: provider.ad_unit_banner
  }));

  const upsertResult = await supabase.from("ad_providers").upsert(rows);

  if (upsertResult.error) {
    res.status(500).json({ error: "Failed to update ad providers" });
    return;
  }

  const listResult = await supabase
    .from("ad_providers")
    .select(
      "id,provider,is_enabled,weight,platform,environment,ad_unit_interstitial,ad_unit_rewarded,ad_unit_banner"
    )
    .order("provider", { ascending: true })
    .order("environment", { ascending: true })
    .order("platform", { ascending: true });

  if (listResult.error) {
    res.status(500).json({ error: "Failed to reload ad providers" });
    return;
  }

  const providers: AdProviderRow[] = (listResult.data as any[]).map((row) => ({
    id: String(row.id),
    provider: row.provider as AdProviderName,
    is_enabled: !!row.is_enabled,
    weight: Number(row.weight ?? 100),
    platform: row.platform as "android" | "ios" | "both",
    environment: row.environment as "dev" | "staging" | "prod",
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
  }));

  res.status(200).json({ providers });
}

