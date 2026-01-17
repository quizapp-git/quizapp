import type { NextApiRequest, NextApiResponse } from "next";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";

type SettingsResponse = {
  coins_to_pkr: unknown;
  withdrawal_threshold: unknown;
  ad_revenue_share: unknown;
};

type ErrorResponse = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SettingsResponse | ErrorResponse>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("app_settings")
    .select("key,value")
    .in("key", ["coins_to_pkr", "withdrawal_threshold", "ad_revenue_share"]);

  if (error || !data) {
    res.status(500).json({ error: "Failed to load settings" });
    return;
  }

  const coinsToPkr = data.find((row: any) => row.key === "coins_to_pkr");
  const withdrawalThreshold = data.find(
    (row: any) => row.key === "withdrawal_threshold"
  );
  const adRevenueShare = data.find(
    (row: any) => row.key === "ad_revenue_share"
  );

  res.status(200).json({
    coins_to_pkr: coinsToPkr?.value ?? null,
    withdrawal_threshold: withdrawalThreshold?.value ?? null,
    ad_revenue_share: adRevenueShare?.value ?? null
  });
}

