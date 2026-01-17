import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";

type AdRevenueShare = {
  id: string;
  date: string;
  admob_app_id: string;
  impressions_count: number;
  share_pkr: number;
  share_coins: number;
};

type AdRevenueSharesResponse = {
  items: AdRevenueShare[];
};

type ErrorResponse = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AdRevenueSharesResponse | ErrorResponse>
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

  const { from, to } = req.query;

  let query = supabase
    .from("ad_revenue_user_distributions")
    .select("id,date,admob_app_id,impressions_count,share_pkr,share_coins")
    .eq("user_id", user.id)
    .order("date", { ascending: false });

  if (typeof from === "string" && from.length > 0) {
    query = query.gte("date", from);
  }

  if (typeof to === "string" && to.length > 0) {
    query = query.lte("date", to);
  }

  const { data, error } = await query;

  if (error || !data) {
    res.status(500).json({ error: "Failed to load ad revenue shares" });
    return;
  }

  res.status(200).json({
    items: data as AdRevenueShare[]
  });
}

