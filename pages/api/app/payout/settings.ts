import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";

type PayoutSettingsResponse = {
  pkr_per_coin: number;
  min_pkr: number;
  methods: string[];
};

type ErrorResponse = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PayoutSettingsResponse | ErrorResponse>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  let supabase;

  try {
    const context = await getAuthContext(req);
    supabase = context.supabase;
  } catch {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { data, error } = await supabase
    .from("app_settings")
    .select("key,value")
    .in("key", ["coins_to_pkr", "withdrawal_threshold"]);

  if (error || !data) {
    res.status(500).json({ error: "Failed to load settings" });
    return;
  }

  const coinsToPkr = data.find((row: any) => row.key === "coins_to_pkr");
  const withdrawalThreshold = data.find(
    (row: any) => row.key === "withdrawal_threshold"
  );

  const pkrPerCoin =
    typeof coinsToPkr?.value?.pkr_per_coin === "number"
      ? coinsToPkr.value.pkr_per_coin
      : Number(coinsToPkr?.value?.pkr_per_coin ?? 1);

  const minPkr =
    typeof withdrawalThreshold?.value?.min_pkr === "number"
      ? withdrawalThreshold.value.min_pkr
      : Number(withdrawalThreshold?.value?.min_pkr ?? 0);

  res.status(200).json({
    pkr_per_coin: pkrPerCoin,
    min_pkr: minPkr,
    methods: ["bank_transfer", "easypaisa", "jazzcash"]
  });
}

