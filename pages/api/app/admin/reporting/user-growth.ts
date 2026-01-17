import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";

type UserGrowthPoint = {
  date: string;
  new_users: number;
  dau: number;
  total_sessions_started: number;
  total_sessions_completed: number;
  avg_sessions_per_user: number;
};

type UserRetentionPoint = {
  cohort_date: string;
  day_offset: number;
  active_users: number;
};

type UserGrowthReportResponse = {
  bucket: "day" | "week" | "month";
  range: { from: string; to: string };
  growth: UserGrowthPoint[];
  retention: UserRetentionPoint[];
};

type ErrorResponse = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UserGrowthReportResponse | ErrorResponse>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  let supabase;
  let user;

  try {
    const context = await getAuthContext(req);
    supabase = context.supabase;
    user = context.user;
  } catch {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { data: adminProfile, error: adminError } = await supabase
    .from("admin_profiles")
    .select("id,is_super_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (adminError || !adminProfile) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { from, to, bucket = "day" } = req.query;

  const fromDate = typeof from === "string" && from.length > 0 ? from : null;
  const toDate = typeof to === "string" && to.length > 0 ? to : null;

  const normalizedBucket =
    bucket === "week" || bucket === "month" ? bucket : "day";

  const { data: growthData, error: growthError } = await supabase
    .from("user_engagement_stats")
    .select("*")
    .gte("date", fromDate ?? "1970-01-01")
    .lte("date", toDate ?? "2999-12-31")
    .order("date", { ascending: true });

  if (growthError || !growthData) {
    res.status(500).json({ error: "Failed to load user growth stats" });
    return;
  }

  const { data: retentionData, error: retentionError } = await supabase
    .from("user_retention_stats")
    .select("*")
    .order("cohort_date", { ascending: true });

  if (retentionError || !retentionData) {
    res.status(500).json({ error: "Failed to load retention stats" });
    return;
  }

  const growth = (growthData as any[]).map((row) => ({
    date: row.date as string,
    new_users: Number((row as any).new_users ?? 0),
    dau: Number((row as any).dau ?? 0),
    total_sessions_started: Number(
      (row as any).total_sessions_started ?? 0
    ),
    total_sessions_completed: Number(
      (row as any).total_sessions_completed ?? 0
    ),
    avg_sessions_per_user: Number(
      (row as any).avg_sessions_per_user ?? 0
    )
  }));

  const retention = (retentionData as any[]).map((row) => ({
    cohort_date: (row as any).cohort_date as string,
    day_offset: Number((row as any).day_offset),
    active_users: Number((row as any).active_users ?? 0)
  }));

  res.status(200).json({
    bucket: normalizedBucket,
    range: { from: fromDate ?? "", to: toDate ?? "" },
    growth,
    retention
  });
}

