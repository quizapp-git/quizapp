import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";

type WalletSummary = {
  coins_balance: number;
  coins_balance_pkr: number;
  pkr_per_coin: number;
  lifetime_earned_coins: number;
  total_from_quizzes_coins: number;
  total_from_ad_revenue_coins: number;
  total_from_ad_revenue_pkr: number;
  total_withdrawn_coins: number;
  total_withdrawn_pkr: number;
  withdrawal_threshold_pkr: number;
};

type ErrorResponse = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<WalletSummary | ErrorResponse>
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

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,coins_balance,lifetime_earned_coins")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const { data: settingsRows, error: settingsError } = await supabase
    .from("app_settings")
    .select("key,value")
    .in("key", ["coins_to_pkr", "withdrawal_threshold"]);

  if (settingsError || !settingsRows) {
    res.status(500).json({ error: "Failed to load settings" });
    return;
  }

  const coinsToPkr = settingsRows.find(
    (row: any) => row.key === "coins_to_pkr"
  );
  const withdrawalThreshold = settingsRows.find(
    (row: any) => row.key === "withdrawal_threshold"
  );

  const pkrPerCoin =
    typeof coinsToPkr?.value?.pkr_per_coin === "number"
      ? coinsToPkr.value.pkr_per_coin
      : Number(coinsToPkr?.value?.pkr_per_coin ?? 1);

  const withdrawalMinPkr =
    typeof withdrawalThreshold?.value?.min_pkr === "number"
      ? withdrawalThreshold.value.min_pkr
      : Number(withdrawalThreshold?.value?.min_pkr ?? 0);

  const { data: transactions, error: transactionsError } = await supabase
    .from("coin_transactions")
    .select("type,amount_coins,pkr_value_per_coin")
    .eq("user_id", user.id);

  if (transactionsError || !transactions) {
    res
      .status(500)
      .json({ error: "Failed to load coin transactions summary" });
    return;
  }

  let totalFromQuizzesCoins = 0;
  let totalFromAdRevenueCoins = 0;
  let totalWithdrawnCoins = 0;

  for (const tx of transactions as any[]) {
    if (tx.type === "earn") {
      totalFromQuizzesCoins += tx.amount_coins;
    } else if (tx.type === "ad_revenue_share") {
      totalFromAdRevenueCoins += tx.amount_coins;
    } else if (tx.type === "withdrawal") {
      totalWithdrawnCoins += tx.amount_coins;
    }
  }

  const { data: adRevenueRows, error: adRevenueError } = await supabase
    .from("ad_revenue_user_distributions")
    .select("share_coins,share_pkr")
    .eq("user_id", user.id);

  if (adRevenueError || !adRevenueRows) {
    res
      .status(500)
      .json({ error: "Failed to load ad revenue distributions" });
    return;
  }

  let totalAdRevenueCoins = 0;
  let totalAdRevenuePkr = 0;

  for (const row of adRevenueRows as any[]) {
    totalAdRevenueCoins += row.share_coins;
    totalAdRevenuePkr += Number(row.share_pkr);
  }

  const coinsBalance = profile.coins_balance;
  const coinsBalancePkr = coinsBalance * pkrPerCoin;

  const totalWithdrawnPkr = totalWithdrawnCoins * pkrPerCoin;

  res.status(200).json({
    coins_balance: coinsBalance,
    coins_balance_pkr: coinsBalancePkr,
    pkr_per_coin: pkrPerCoin,
    lifetime_earned_coins: profile.lifetime_earned_coins,
    total_from_quizzes_coins: totalFromQuizzesCoins,
    total_from_ad_revenue_coins: totalFromAdRevenueCoins,
    total_from_ad_revenue_pkr: totalAdRevenuePkr,
    total_withdrawn_coins: totalWithdrawnCoins,
    total_withdrawn_pkr: totalWithdrawnPkr,
    withdrawal_threshold_pkr: withdrawalMinPkr
  });
}

