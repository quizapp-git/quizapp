import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";

type AdmobAppDailyPoint = {
  app_id: string;
  date: string;
  impressions: number;
  clicks: number;
  ctr: number;
  estimated_earnings_usd: number;
  estimated_earnings_pkr: number;
  ecpm_pkr: number;
};

type QuizAdPerformancePoint = {
  quiz_id: string;
  date: string;
  avg_ads_per_session: number;
  sessions_after_first_ad: number;
  sessions_after_third_ad: number;
  sessions_after_fifth_ad: number;
  total_sessions: number;
};

type AdmobReportResponse = {
  range: { from: string; to: string };
  app_daily: AdmobAppDailyPoint[];
  quiz_ad_performance: QuizAdPerformancePoint[];
};

type ErrorResponse = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AdmobReportResponse | ErrorResponse>
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

  const { appId, quizId, from, to } = req.query;

  const fromDate = typeof from === "string" && from.length > 0 ? from : null;
  const toDate = typeof to === "string" && to.length > 0 ? to : null;

  let appQuery = supabase
    .from("admob_app_daily_stats")
    .select("*")
    .gte("date", fromDate ?? "1970-01-01")
    .lte("date", toDate ?? "2999-12-31")
    .order("date", { ascending: true });

  if (typeof appId === "string" && appId.length > 0) {
    appQuery = appQuery.eq("admob_app_id", appId);
  }

  let quizQuery = supabase
    .from("quiz_ad_performance_stats")
    .select("*")
    .gte("date", fromDate ?? "1970-01-01")
    .lte("date", toDate ?? "2999-12-31")
    .order("date", { ascending: true });

  if (typeof quizId === "string" && quizId.length > 0) {
    quizQuery = quizQuery.eq("quiz_id", quizId);
  }

  const [{ data: appData, error: appError }, { data: quizData, error: quizError }] =
    await Promise.all([appQuery, quizQuery]);

  if (appError || !appData) {
    res.status(500).json({ error: "Failed to load AdMob app stats" });
    return;
  }

  if (quizError || !quizData) {
    res.status(500).json({ error: "Failed to load quiz ad performance stats" });
    return;
  }

  const app_daily: AdmobAppDailyPoint[] = (appData as any[]).map((row) => ({
    app_id: row.admob_app_id as string,
    date: row.date as string,
    impressions: Number(row.impressions ?? 0),
    clicks: Number(row.clicks ?? 0),
    ctr: Number(row.ctr ?? 0),
    estimated_earnings_usd: Number(row.estimated_earnings_usd ?? 0),
    estimated_earnings_pkr: Number(row.estimated_earnings_pkr ?? 0),
    ecpm_pkr: Number(row.ecpm_pkr ?? 0)
  }));

  const quiz_ad_performance: QuizAdPerformancePoint[] = (quizData as any[]).map(
    (row) => ({
      quiz_id: row.quiz_id as string,
      date: row.date as string,
      avg_ads_per_session: Number(row.avg_ads_per_session ?? 0),
      sessions_after_first_ad: Number(row.sessions_after_first_ad ?? 0),
      sessions_after_third_ad: Number(row.sessions_after_third_ad ?? 0),
      sessions_after_fifth_ad: Number(row.sessions_after_fifth_ad ?? 0),
      total_sessions: Number(row.total_sessions ?? 0)
    })
  );

  res.status(200).json({
    range: { from: fromDate ?? "", to: toDate ?? "" },
    app_daily,
    quiz_ad_performance
  });
}

