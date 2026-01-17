import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";

type CommunicationPolicy = {
  text_preset_only_max_ads: number;
  text_custom_min_ads: number;
  voice_chat_min_ads: number;
};

type GetResponse = CommunicationPolicy;

type UpdateBody = {
  text_preset_only_max_ads?: unknown;
  text_custom_min_ads?: unknown;
  voice_chat_min_ads?: unknown;
};

type UpdateResponse = CommunicationPolicy;

type ErrorResponse = {
  error: string;
};

function parseThreshold(value: unknown, fallback: number): number {
  if (typeof value === "number") {
    if (Number.isFinite(value) && value >= 0) {
      return value;
    }
    return fallback;
  }
  if (typeof value === "string" && value.length > 0) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return fallback;
}

function validatePolicy(policy: CommunicationPolicy): string | null {
  if (policy.text_preset_only_max_ads < 0) {
    return "text_preset_only_max_ads must be non-negative";
  }
  if (policy.text_custom_min_ads < 0) {
    return "text_custom_min_ads must be non-negative";
  }
  if (policy.voice_chat_min_ads < 0) {
    return "voice_chat_min_ads must be non-negative";
  }
  if (policy.text_preset_only_max_ads >= policy.text_custom_min_ads) {
    return "text_preset_only_max_ads must be less than text_custom_min_ads";
  }
  if (policy.text_custom_min_ads > policy.voice_chat_min_ads) {
    return "text_custom_min_ads must be less than or equal to voice_chat_min_ads";
  }
  return null;
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
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "communication_policy")
      .maybeSingle();

    if (error) {
      res
        .status(500)
        .json({ error: "Failed to load communication policy settings" });
      return;
    }

    const value =
      data && data.value && typeof data.value === "object" ? data.value : {};

    const policy: CommunicationPolicy = {
      text_preset_only_max_ads: parseThreshold(
        (value as any).text_preset_only_max_ads,
        99
      ),
      text_custom_min_ads: parseThreshold(
        (value as any).text_custom_min_ads,
        100
      ),
      voice_chat_min_ads: parseThreshold(
        (value as any).voice_chat_min_ads,
        500
      )
    };

    res.status(200).json(policy);
    return;
  }

  const body = req.body as UpdateBody | undefined;

  if (!body) {
    res.status(400).json({ error: "Missing request body" });
    return;
  }

  const existingResult = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "communication_policy")
    .maybeSingle();

  const existingValue =
    existingResult.data &&
    existingResult.data.value &&
    typeof existingResult.data.value === "object"
      ? existingResult.data.value
      : {};

  const mergedValue: Record<string, unknown> = {
    ...((existingValue as Record<string, unknown>) || {})
  };

  if (body.text_preset_only_max_ads !== undefined) {
    mergedValue.text_preset_only_max_ads = body.text_preset_only_max_ads;
  }
  if (body.text_custom_min_ads !== undefined) {
    mergedValue.text_custom_min_ads = body.text_custom_min_ads;
  }
  if (body.voice_chat_min_ads !== undefined) {
    mergedValue.voice_chat_min_ads = body.voice_chat_min_ads;
  }

  const candidatePolicy: CommunicationPolicy = {
    text_preset_only_max_ads: parseThreshold(
      mergedValue.text_preset_only_max_ads,
      99
    ),
    text_custom_min_ads: parseThreshold(mergedValue.text_custom_min_ads, 100),
    voice_chat_min_ads: parseThreshold(mergedValue.voice_chat_min_ads, 500)
  };

  const validationError = validatePolicy(candidatePolicy);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  const { error: upsertError } = await supabase.from("app_settings").upsert({
    key: "communication_policy",
    value: {
      text_preset_only_max_ads: candidatePolicy.text_preset_only_max_ads,
      text_custom_min_ads: candidatePolicy.text_custom_min_ads,
      voice_chat_min_ads: candidatePolicy.voice_chat_min_ads
    }
  });

  if (upsertError) {
    res.status(500).json({ error: "Failed to update communication policy" });
    return;
  }

  res.status(200).json(candidatePolicy);
}

