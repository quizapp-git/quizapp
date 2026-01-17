import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";

type RevenueShareSummaryPoint = {
  date: string;
  admob_app_id: string;
  total_earnings_pkr: number;
  user_share_pkr: number;
  platform_share_pkr: number;
};

type UserEarningsPoint = {
  date: string;
  user_id: string;
  total_share_pkr: number;
  total_share_coins: number;
};

type CoinLiabilityPoint = {
  date: string;
  total_coins_in_circulation: number;
  total_liability_pkr: number;
};

type CoinVelocityPoint = {
  date: string;
  coins_generated: number;
  coins_withdrawn: number;
};

type RevenueShareReportResponse = {
  range: { from: string; to: string };
  revenue_share: RevenueShareSummaryPoint[];
  user_distribution: UserEarningsPoint[];
  coin_liability: CoinLiabilityPoint[];
  coin_velocity: CoinVelocityPoint[];
};

type ErrorResponse = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RevenueShareReportResponse | ErrorResponse>
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

  const { from, to } = req.query;

  const fromDate = typeof from === "string" && from.length > 0 ? from : null;
  const toDate = typeof to === "string" && to.length > 0 ? to : null;

  const [{ data: revenueShareData, error: revenueShareError }, { data: userDistData, error: userDistError }, { data: liabilityData, error: liabilityError }, { data: velocityData, error: velocityError }] =
    await Promise.all([
      supabase
        .from("revenue_share_summary")
        .select("*")
        .gte("date", fromDate ?? "1970-01-01")
        .lte("date", toDate ?? "2999-12-31")
        .order("date", { ascending: true }),
      supabase
        .from("user_earnings_distribution")
        .select("*")
        .gte("date", fromDate ?? "1970-01-01")
        .lte("date", toDate ?? "2999-12-31"),
      supabase.from("coin_liability_stats").select("*").limit(1),
      supabase
        .from("coin_velocity_stats")
        .select("*")
        .gte("date", fromDate ?? "1970-01-01")
        .lte("date", toDate ?? "2999-12-31")
        .order("date", { ascending: true })
    ]);

  if (revenueShareError || !revenueShareData) {
    res.status(500).json({ error: "Failed to load revenue share stats" });
    return;
  }

  if (userDistError || !userDistData) {
    res.status(500).json({ error: "Failed to load user earnings distribution" });
    return;
  }

  if (liabilityError || !liabilityData) {
    res.status(500).json({ error: "Failed to load coin liability stats" });
    return;
  }

  if (velocityError || !velocityData) {
    res.status(500).json({ error: "Failed to load coin velocity stats" });
    return;
  }

  const revenue_share: RevenueShareSummaryPoint[] = (
    revenueShareData as any[]
  ).map((row) => ({
    date: row.date as string,
    admob_app_id: row.admob_app_id as string,
    total_earnings_pkr: Number(row.total_earnings_pkr ?? 0),
    user_share_pkr: Number(row.user_share_pkr ?? 0),
    platform_share_pkr: Number(row.platform_share_pkr ?? 0)
  }));

  const user_distribution: UserEarningsPoint[] = (userDistData as any[]).map(
    (row) => ({
      date: row.date as string,
      user_id: row.user_id as string,
      total_share_pkr: Number(row.total_share_pkr ?? 0),
      total_share_coins: Number(row.total_share_coins ?? 0)
    })
  );

  const liabilityRow = (liabilityData as any[])[0];

  const coin_liability: CoinLiabilityPoint[] = liabilityRow
    ? [
        {
          date: liabilityRow.date as string,
          total_coins_in_circulation: Number(
            liabilityRow.total_coins_in_circulation ?? 0
          ),
          total_liability_pkr: Number(
            liabilityRow.total_liability_pkr ?? 0
          )
        }
      ]
    : [];

  const coin_velocity: CoinVelocityPoint[] = (velocityData as any[]).map(
    (row) => ({
      date: row.date as string,
      coins_generated: Number(row.coins_generated ?? 0),
      coins_withdrawn: Number(row.coins_withdrawn ?? 0)
    })
  );

  res.status(200).json({
    range: { from: fromDate ?? "", to: toDate ?? "" },
    revenue_share,
    user_distribution,
    coin_liability,
    coin_velocity
  });
}

