import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";
import type { CommunicationStage } from "@/lib/communicationStatus";

type OverrideRow = {
  user_id: string;
  forced_stage: CommunicationStage;
  expires_at: string | null;
};

type GetResponse = {
  override: OverrideRow | null;
};

type UpsertBody = {
  user_id?: unknown;
  forced_stage?: unknown;
  expires_at?: unknown;
};

type UpsertResponse = {
  override: OverrideRow;
};

type DeleteBody = {
  user_id?: unknown;
};

type DeleteResponse = {
  success: boolean;
};

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

function parseUserId(input: unknown): string | null {
  if (typeof input === "string" && input.length > 0) {
    return input;
  }
  return null;
}

function parseStage(input: unknown): CommunicationStage | null {
  if (input === "PRESET_ONLY" || input === "CUSTOM_TEXT" || input === "VOICE_ENABLED") {
    return input;
  }
  return null;
}

function parseExpiresAt(input: unknown): string | null {
  if (input === null || input === undefined || input === "") {
    return null;
  }
  if (typeof input === "string") {
    const date = new Date(input);
    if (Number.isFinite(date.getTime())) {
      return date.toISOString();
    }
  }
  return null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetResponse | UpsertResponse | DeleteResponse | ErrorResponse>
) {
  if (req.method !== "GET" && req.method !== "PUT" && req.method !== "DELETE") {
    res.setHeader("Allow", "GET,PUT,DELETE");
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
    const { user_id: userIdParam } = req.query;
    const userId =
      typeof userIdParam === "string" && userIdParam.length > 0
        ? userIdParam
        : null;

    if (!userId) {
      res.status(400).json({ error: "user_id is required" });
      return;
    }

    const { data, error } = await supabase
      .from("user_communication_overrides")
      .select("user_id,forced_stage,expires_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      res.status(500).json({ error: "Failed to load override" });
      return;
    }

    if (!data) {
      res.status(200).json({ override: null });
      return;
    }

    res.status(200).json({
      override: {
        user_id: data.user_id as string,
        forced_stage: data.forced_stage as CommunicationStage,
        expires_at: data.expires_at
          ? new Date(data.expires_at as string).toISOString()
          : null
      }
    });
    return;
  }

  if (req.method === "PUT") {
    const body = req.body as UpsertBody | undefined;

    if (!body) {
      res.status(400).json({ error: "Missing request body" });
      return;
    }

    const userId = parseUserId(body.user_id);
    if (!userId) {
      res.status(400).json({ error: "user_id is required" });
      return;
    }

    const stage = parseStage(body.forced_stage);
    if (!stage) {
      res.status(400).json({
        error:
          "forced_stage must be one of PRESET_ONLY, CUSTOM_TEXT or VOICE_ENABLED"
      });
      return;
    }

    const expiresAt = parseExpiresAt(body.expires_at);

    const { data: profileRow, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      res.status(500).json({ error: "Failed to verify user" });
      return;
    }

    if (!profileRow) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const { data, error } = await supabase
      .from("user_communication_overrides")
      .upsert({
        user_id: userId,
        forced_stage: stage,
        expires_at: expiresAt
      })
      .select("user_id,forced_stage,expires_at")
      .single();

    if (error || !data) {
      res.status(500).json({ error: "Failed to upsert override" });
      return;
    }

    res.status(200).json({
      override: {
        user_id: data.user_id as string,
        forced_stage: data.forced_stage as CommunicationStage,
        expires_at: data.expires_at
          ? new Date(data.expires_at as string).toISOString()
          : null
      }
    });
    return;
  }

  const body = req.body as DeleteBody | undefined;

  if (!body) {
    res.status(400).json({ error: "Missing request body" });
    return;
  }

  const userId = parseUserId(body.user_id);
  if (!userId) {
    res.status(400).json({ error: "user_id is required" });
    return;
  }

  const { error } = await supabase
    .from("user_communication_overrides")
    .delete()
    .eq("user_id", userId);

  if (error) {
    res.status(500).json({ error: "Failed to delete override" });
    return;
  }

  res.status(200).json({ success: true });
}

