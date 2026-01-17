import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";

type QuizPerformancePoint = {
  quiz_id: string;
  date: string;
  sessions_started: number;
  sessions_completed: number;
  avg_correct_answers: number;
  avg_coins_earned: number;
  completion_rate: number;
  difficulty: string;
  title: string;
  status: string;
};

type QuizPerformanceReportResponse = {
  range: { from: string; to: string };
  points: QuizPerformancePoint[];
  top_quizzes: QuizPerformancePoint[];
  underperforming_quizzes: QuizPerformancePoint[];
};

type ErrorResponse = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<QuizPerformanceReportResponse | ErrorResponse>
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

  const { quizId, from, to } = req.query;

  const fromDate = typeof from === "string" && from.length > 0 ? from : null;
  const toDate = typeof to === "string" && to.length > 0 ? to : null;

  let query = supabase
    .from("quiz_performance_stats")
    .select("*")
    .gte("date", fromDate ?? "1970-01-01")
    .lte("date", toDate ?? "2999-12-31")
    .order("date", { ascending: true });

  if (typeof quizId === "string" && quizId.length > 0) {
    query = query.eq("quiz_id", quizId);
  }

  const { data, error } = await query;

  if (error || !data) {
    res.status(500).json({ error: "Failed to load quiz performance stats" });
    return;
  }

  const points: QuizPerformancePoint[] = (data as any[]).map((row) => ({
    quiz_id: row.quiz_id as string,
    date: row.date as string,
    sessions_started: Number(row.sessions_started ?? 0),
    sessions_completed: Number(row.sessions_completed ?? 0),
    avg_correct_answers: Number(row.avg_correct_answers ?? 0),
    avg_coins_earned: Number(row.avg_coins_earned ?? 0),
    completion_rate: Number(row.completion_rate ?? 0),
    difficulty: String(row.difficulty ?? ""),
    title: String(row.title ?? ""),
    status: String(row.status ?? "")
  }));

  const byQuiz = new Map<string, QuizPerformancePoint>();

  for (const point of points) {
    const existing = byQuiz.get(point.quiz_id);
    if (!existing || point.sessions_started > existing.sessions_started) {
      byQuiz.set(point.quiz_id, point);
    }
  }

  const aggregated = Array.from(byQuiz.values());

  const top_quizzes = aggregated
    .filter((p) => p.sessions_started > 0)
    .sort((a, b) => {
      const aScore = a.completion_rate * a.sessions_started;
      const bScore = b.completion_rate * b.sessions_started;
      return bScore - aScore;
    })
    .slice(0, 20);

  const underperforming_quizzes = aggregated
    .filter((p) => p.sessions_started >= 10)
    .sort((a, b) => a.completion_rate - b.completion_rate)
    .slice(0, 20);

  res.status(200).json({
    range: { from: fromDate ?? "", to: toDate ?? "" },
    points,
    top_quizzes,
    underperforming_quizzes
  });
}

