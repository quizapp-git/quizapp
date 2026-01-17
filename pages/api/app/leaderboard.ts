import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";

type LeaderboardEntry = {
  rank: number;
  user_id: string;
  username: string | null;
  lifetime_income_pkr: number;
  lifetime_earned_coins: number;
  total_quizzes_played: number;
};

type LeaderboardResponse = {
  period: "all_time" | "weekly" | "monthly";
  limit: number;
  entries: LeaderboardEntry[];
  current_user_rank: number | null;
};

type ErrorResponse = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LeaderboardResponse | ErrorResponse>
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

  const { period = "all_time", limit = "100" } = req.query;

  const normalizedPeriod =
    period === "weekly" || period === "monthly" ? period : "all_time";

  const limitNumber = Math.max(
    1,
    Math.min(
      100,
      typeof limit === "string" ? parseInt(limit, 10) || 100 : 100
    )
  );

  const { data, error } = await supabase
    .from("player_stats")
    .select(
      "user_id,total_quizzes_played,lifetime_income_pkr,profiles(username,lifetime_earned_coins)"
    )
    .order("lifetime_income_pkr", { ascending: false })
    .limit(limitNumber);

  if (error || !data) {
    res.status(500).json({ error: "Failed to load leaderboard" });
    return;
  }

  const entries: LeaderboardEntry[] = (data as any[]).map((row, index) => ({
    rank: index + 1,
    user_id: row.user_id,
    username: row.profiles?.username ?? null,
    lifetime_income_pkr: Number(row.lifetime_income_pkr ?? 0),
    lifetime_earned_coins: Number(row.profiles?.lifetime_earned_coins ?? 0),
    total_quizzes_played: Number(row.total_quizzes_played ?? 0)
  }));

  const currentUserIndex = entries.findIndex(
    (entry) => entry.user_id === user.id
  );

  res.status(200).json({
    period: normalizedPeriod,
    limit: limitNumber,
    entries,
    current_user_rank: currentUserIndex >= 0 ? currentUserIndex + 1 : null
  });
}

