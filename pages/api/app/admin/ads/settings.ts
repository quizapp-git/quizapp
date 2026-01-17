import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";

type AdsAdminSettings = {
  ads_enabled: boolean;
  max_ads_per_quiz_session: number;
  show_ad_after_every_question: boolean;
};

type GetResponse = AdsAdminSettings;

type UpdateBody = {
  ads_enabled?: unknown;
  max_ads_per_quiz_session?: unknown;
  show_ad_after_every_question?: unknown;
};

type UpdateResponse = AdsAdminSettings;

type ErrorResponse = {
  error: string;
};

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    if (value === "true") {
      return true;
    }
    if (value === "false") {
      return false;
    }
  }
  return fallback;
}

function parsePositiveInteger(value: unknown, fallback: number): number {
  if (typeof value === "number") {
    if (Number.isFinite(value) && value > 0) {
      return Math.floor(value);
    }
    return fallback;
  }
  if (typeof value === "string" && value.length > 0) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return fallback;
}

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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetResponse | UpdateResponse | ErrorResponse>
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
      .from("app_ad_settings")
      .select("ads_enabled,max_ads_per_quiz_session,show_ad_after_every_question")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (result.error) {
      res.status(500).json({ error: "Failed to load ads settings" });
      return;
    }

    const row = result.data as
      | {
          ads_enabled: boolean | null;
          max_ads_per_quiz_session: number | null;
          show_ad_after_every_question: boolean | null;
        }
      | null;

    const settings: AdsAdminSettings = {
      ads_enabled:
        row && typeof row.ads_enabled === "boolean"
          ? row.ads_enabled
          : true,
      max_ads_per_quiz_session:
        row &&
        typeof row.max_ads_per_quiz_session === "number" &&
        Number.isFinite(row.max_ads_per_quiz_session) &&
        row.max_ads_per_quiz_session > 0
          ? row.max_ads_per_quiz_session
          : 10,
      show_ad_after_every_question:
        row && typeof row.show_ad_after_every_question === "boolean"
          ? row.show_ad_after_every_question
          : true
    };

    res.status(200).json(settings);
    return;
  }

  const body = req.body as UpdateBody | undefined;

  if (!body) {
    res.status(400).json({ error: "Missing request body" });
    return;
  }

  const existingResult = await supabase
    .from("app_ad_settings")
    .select("ads_enabled,max_ads_per_quiz_session,show_ad_after_every_question")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const existing =
    existingResult.data && !existingResult.error
      ? (existingResult.data as {
          ads_enabled: boolean | null;
          max_ads_per_quiz_session: number | null;
          show_ad_after_every_question: boolean | null;
        })
      : null;

  const current: AdsAdminSettings = {
    ads_enabled:
      existing && typeof existing.ads_enabled === "boolean"
        ? existing.ads_enabled
        : true,
    max_ads_per_quiz_session:
      existing &&
      typeof existing.max_ads_per_quiz_session === "number" &&
      Number.isFinite(existing.max_ads_per_quiz_session) &&
      existing.max_ads_per_quiz_session > 0
        ? existing.max_ads_per_quiz_session
        : 10,
    show_ad_after_every_question:
      existing && typeof existing.show_ad_after_every_question === "boolean"
        ? existing.show_ad_after_every_question
        : true
  };

  const next: AdsAdminSettings = {
    ads_enabled: body.ads_enabled
      ? parseBoolean(body.ads_enabled, current.ads_enabled)
      : current.ads_enabled,
    max_ads_per_quiz_session: body.max_ads_per_quiz_session
      ? parsePositiveInteger(
          body.max_ads_per_quiz_session,
          current.max_ads_per_quiz_session
        )
      : current.max_ads_per_quiz_session,
    show_ad_after_every_question: body.show_ad_after_every_question
      ? parseBoolean(
          body.show_ad_after_every_question,
          current.show_ad_after_every_question
        )
      : current.show_ad_after_every_question
  };

  if (next.max_ads_per_quiz_session <= 0) {
    res.status(400).json({ error: "max_ads_per_quiz_session must be positive" });
    return;
  }

  const insertResult = await supabase.from("app_ad_settings").insert({
    ads_enabled: next.ads_enabled,
    max_ads_per_quiz_session: next.max_ads_per_quiz_session,
    show_ad_after_every_question: next.show_ad_after_every_question
  });

  if (insertResult.error) {
    res.status(500).json({ error: "Failed to update ads settings" });
    return;
  }

  res.status(200).json(next);
}

